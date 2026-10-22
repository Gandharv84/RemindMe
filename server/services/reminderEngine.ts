import { db } from '../db';
import { notificationService } from './notificationService';
import { Reminder, ReminderCategory, ReminderStatus, NotificationChannel } from '../../src/types';
import { acquireReminderLock } from '../postgres';

export interface EngineRunSummary {
  evaluatedVehicles: number;
  newRemindersCreated: number;
  existingRemindersUpdated: number;
  notificationsDispatched: number;
  logs: string[];
  timestamp: string;
}

export class ReminderEngine {
  private activeRun: Promise<EngineRunSummary> | null = null;
  private calculateDayDifference(targetDateStr: string, referenceDateStr?: string): number {
    const ref = referenceDateStr ? new Date(referenceDateStr) : new Date();
    // Reset hours to compare purely calendar dates
    const refMidnight = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate()).getTime();

    const [y, m, d] = targetDateStr.split('-').map(Number);
    const targetMidnight = new Date(y, m - 1, d).getTime();

    const diffMs = targetMidnight - refMidnight;
    return Math.round(diffMs / (1000 * 60 * 60 * 24));
  }

  /**
   * Main engine runner: scans vehicles, services, insurance, and documents.
   */
  public run(referenceDateStr?: string): Promise<EngineRunSummary> {
    if (this.activeRun) return this.activeRun;
    this.activeRun = this.evaluate(referenceDateStr).finally(() => { this.activeRun = null; });
    return this.activeRun;
  }

  private async evaluate(referenceDateStr?: string): Promise<EngineRunSummary> {
    const releaseLock = await acquireReminderLock();
    if (!releaseLock) {
      return { evaluatedVehicles: 0, newRemindersCreated: 0, existingRemindersUpdated: 0, notificationsDispatched: 0, logs: ['[ENGINE] Another instance is evaluating reminders.'], timestamp: new Date().toISOString() };
    }
    try {
      return await this.evaluateWithLock(referenceDateStr);
    } finally {
      await releaseLock();
    }
  }

  private async evaluateWithLock(referenceDateStr?: string): Promise<EngineRunSummary> {
    const logs: string[] = [];
    let newRemindersCount = 0;
    let updatedRemindersCount = 0;
    let notificationsCount = 0;

    const vehicles = db.vehicles.filter(v => v.status === 'ACTIVE');
    logs.push(`[ENGINE] Starting Reminder Engine evaluation for ${vehicles.length} active vehicles.`);

    for (const vehicle of vehicles) {
      const customer = db.customers.find(c => c.id === vehicle.customerId);
      if (!customer || customer.status === 'INACTIVE') continue;

      const showroom = db.showrooms.find(s => s.id === vehicle.showroomId);
      const showroomName = showroom ? showroom.name : 'Dealership';

      // 1. Evaluate Service Due Date
      if (vehicle.nextServiceDate) {
        const daysRemaining = this.calculateDayDifference(vehicle.nextServiceDate, referenceDateStr);
        const scheduleDays = [30, 15, 7, 1, 0];

        // Determine if within reminder window (<= 30 days or overdue)
        if (daysRemaining <= 30) {
          const status: ReminderStatus = daysRemaining < 0
            ? 'OVERDUE'
            : daysRemaining === 0
              ? 'DUE_TODAY'
              : 'UPCOMING';

          // Check if reminder already exists for this service cycle
          const existing = db.reminders.find(r =>
            r.vehicleId === vehicle.id &&
            r.category === 'SERVICE' &&
            r.dueDate === vehicle.nextServiceDate &&
            r.status !== 'CANCELLED'
          );

          const title = daysRemaining < 0
            ? `OVERDUE: Service was due ${Math.abs(daysRemaining)} days ago`
            : daysRemaining === 0
              ? `DUE TODAY: Periodic Service for ${vehicle.registrationNumber}`
              : `Service Due in ${daysRemaining} Day${daysRemaining === 1 ? '' : 's'}`;

          const description = `Periodic service for ${vehicle.brand} ${vehicle.model} (${vehicle.registrationNumber}). Scheduled for ${vehicle.nextServiceDate}.`;

          if (!existing) {
            const newReminder = await db.addReminder({
              vehicleId: vehicle.id,
              customerId: customer.id,
              showroomId: vehicle.showroomId,
              category: 'SERVICE',
              title,
              description,
              dueDate: vehicle.nextServiceDate,
              targetDaysBefore: daysRemaining >= 0 ? daysRemaining : 0,
              status,
              triggeredAt: new Date().toISOString()
            });
            newRemindersCount++;
            logs.push(`[SERVICE REMINDER CREATED] ${vehicle.registrationNumber} (${status}) -> Due: ${vehicle.nextServiceDate}`);

            // Dispatch notification (SMS and/or Email according to customer preference)
            const channel: NotificationChannel = customer.preferredChannel === 'SMS' ? 'SMS' : 'EMAIL';
            const template = notificationService.generateTemplate('SERVICE', channel, {
              customerName: customer.name,
              vehicleReg: vehicle.registrationNumber,
              brandModel: `${vehicle.brand} ${vehicle.model}`,
              dueDate: vehicle.nextServiceDate,
              daysRemaining,
              showroomName
            });

            await notificationService.send({
              reminderId: newReminder.id,
              vehicleId: vehicle.id,
              customerId: customer.id,
              showroomId: vehicle.showroomId,
              type: 'SERVICE_REMINDER',
              channel,
              recipient: channel === 'SMS' ? customer.phone : customer.email,
              subject: template.subject,
              message: template.message
            });
            notificationsCount++;
          } else {
            // Update existing reminder status if changed (e.g. from UPCOMING to DUE_TODAY or OVERDUE)
            if (existing.status !== 'COMPLETED' && existing.status !== status) {
              await db.updateReminder(existing.id, { status, title });
              updatedRemindersCount++;
              logs.push(`[SERVICE REMINDER UPDATED] ${vehicle.registrationNumber} status changed to ${status}`);
            }
          }
        }
      }

      // 2. Evaluate Insurance Expiry Date
      if (vehicle.insuranceExpiryDate) {
        const daysRemaining = this.calculateDayDifference(vehicle.insuranceExpiryDate, referenceDateStr);
        if (daysRemaining <= 30) {
          const status: ReminderStatus = daysRemaining < 0
            ? 'OVERDUE'
            : daysRemaining === 0
              ? 'DUE_TODAY'
              : 'UPCOMING';

          const existing = db.reminders.find(r =>
            r.vehicleId === vehicle.id &&
            r.category === 'INSURANCE' &&
            r.dueDate === vehicle.insuranceExpiryDate &&
            r.status !== 'CANCELLED'
          );

          const title = daysRemaining < 0
            ? `OVERDUE: Insurance expired ${Math.abs(daysRemaining)} days ago`
            : daysRemaining === 0
              ? `DUE TODAY: Insurance Policy Expiry (${vehicle.registrationNumber})`
              : `Insurance Renewal Due in ${daysRemaining} Day${daysRemaining === 1 ? '' : 's'}`;

          const description = `Insurance renewal for ${vehicle.brand} ${vehicle.model} (${vehicle.registrationNumber}). Policy expiry: ${vehicle.insuranceExpiryDate}.`;

          if (!existing) {
            const newReminder = await db.addReminder({
              vehicleId: vehicle.id,
              customerId: customer.id,
              showroomId: vehicle.showroomId,
              category: 'INSURANCE',
              title,
              description,
              dueDate: vehicle.insuranceExpiryDate,
              targetDaysBefore: daysRemaining >= 0 ? daysRemaining : 0,
              status,
              triggeredAt: new Date().toISOString()
            });
            newRemindersCount++;
            logs.push(`[INSURANCE REMINDER CREATED] ${vehicle.registrationNumber} (${status}) -> Expiry: ${vehicle.insuranceExpiryDate}`);

            const channel: NotificationChannel = customer.preferredChannel === 'SMS' ? 'SMS' : 'EMAIL';
            const template = notificationService.generateTemplate('INSURANCE', channel, {
              customerName: customer.name,
              vehicleReg: vehicle.registrationNumber,
              brandModel: `${vehicle.brand} ${vehicle.model}`,
              dueDate: vehicle.insuranceExpiryDate,
              daysRemaining,
              showroomName
            });

            await notificationService.send({
              reminderId: newReminder.id,
              vehicleId: vehicle.id,
              customerId: customer.id,
              showroomId: vehicle.showroomId,
              type: 'INSURANCE_RENEWAL',
              channel,
              recipient: channel === 'SMS' ? customer.phone : customer.email,
              subject: template.subject,
              message: template.message
            });
            notificationsCount++;
          } else {
            if (existing.status !== 'COMPLETED' && existing.status !== status) {
              await db.updateReminder(existing.id, { status, title });
              updatedRemindersCount++;
              logs.push(`[INSURANCE REMINDER UPDATED] ${vehicle.registrationNumber} status changed to ${status}`);
            }
          }
        }
      }

      // 3. Evaluate PUC Expiry Date
      if (vehicle.pucExpiryDate) {
        const daysRemaining = this.calculateDayDifference(vehicle.pucExpiryDate, referenceDateStr);
        if (daysRemaining <= 30) {
          const status: ReminderStatus = daysRemaining < 0
            ? 'OVERDUE'
            : daysRemaining === 0
              ? 'DUE_TODAY'
              : 'UPCOMING';

          const existing = db.reminders.find(r =>
            r.vehicleId === vehicle.id &&
            r.category === 'PUC' &&
            r.dueDate === vehicle.pucExpiryDate &&
            r.status !== 'CANCELLED'
          );

          const title = daysRemaining < 0
            ? `OVERDUE: PUC Certificate Expired ${Math.abs(daysRemaining)} days ago`
            : daysRemaining === 0
              ? `DUE TODAY: PUC Certificate Expiry (${vehicle.registrationNumber})`
              : `PUC Expiry in ${daysRemaining} Day${daysRemaining === 1 ? '' : 's'}`;

          const description = `Pollution Under Control (PUC) certificate expiry for ${vehicle.registrationNumber}. Valid till ${vehicle.pucExpiryDate}.`;

          if (!existing) {
            const newReminder = await db.addReminder({
              vehicleId: vehicle.id,
              customerId: customer.id,
              showroomId: vehicle.showroomId,
              category: 'PUC',
              title,
              description,
              dueDate: vehicle.pucExpiryDate,
              targetDaysBefore: daysRemaining >= 0 ? daysRemaining : 0,
              status,
              triggeredAt: new Date().toISOString()
            });
            newRemindersCount++;
            logs.push(`[PUC REMINDER CREATED] ${vehicle.registrationNumber} (${status}) -> Expiry: ${vehicle.pucExpiryDate}`);

            const channel: NotificationChannel = 'SMS';
            const template = notificationService.generateTemplate('PUC', channel, {
              customerName: customer.name,
              vehicleReg: vehicle.registrationNumber,
              brandModel: `${vehicle.brand} ${vehicle.model}`,
              dueDate: vehicle.pucExpiryDate,
              daysRemaining,
              showroomName
            });

            await notificationService.send({
              reminderId: newReminder.id,
              vehicleId: vehicle.id,
              customerId: customer.id,
              showroomId: vehicle.showroomId,
              type: 'PUC_EXPIRY',
              channel,
              recipient: customer.phone,
              subject: template.subject,
              message: template.message
            });
            notificationsCount++;
          } else {
            if (existing.status !== 'COMPLETED' && existing.status !== status) {
              await db.updateReminder(existing.id, { status, title });
              updatedRemindersCount++;
              logs.push(`[PUC REMINDER UPDATED] ${vehicle.registrationNumber} status changed to ${status}`);
            }
          }
        }
      }
    }

    logs.push(`[ENGINE FINISHED] Evaluation complete. Created: ${newRemindersCount}, Updated: ${updatedRemindersCount}, Dispatched: ${notificationsCount}`);

    return {
      evaluatedVehicles: vehicles.length,
      newRemindersCreated: newRemindersCount,
      existingRemindersUpdated: updatedRemindersCount,
      notificationsDispatched: notificationsCount,
      logs,
      timestamp: new Date().toISOString()
    };
  }
}

export const reminderEngine = new ReminderEngine();
