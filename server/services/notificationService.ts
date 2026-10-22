import { db } from '../db';
import { Notification, NotificationChannel, NotificationMode, NotificationStatus } from '../../src/types';

export interface SendNotificationPayload {
  reminderId?: string;
  vehicleId: string;
  customerId: string;
  showroomId: string;
  type: string;
  channel: NotificationChannel;
  recipient: string;
  subject: string;
  message: string;
}

export class NotificationService {
  /**
   * Dispatches a notification through the configured channel.
   * In Prototype/Demo Mode, this creates realistic carrier/SMTP simulated logs
   * and saves the delivery record to the database without pretending real SMS/Email went out.
   */
  public async send(payload: SendNotificationPayload): Promise<Notification> {
    const isEmail = payload.channel === 'EMAIL';
    const isSms = payload.channel === 'SMS';
    const isWhatsApp = payload.channel === 'WHATSAPP';

    let deliveryNotes = '';
    let status: NotificationStatus = 'DELIVERED';

    if (isEmail) {
      deliveryNotes = `[DEMO SMTP RELAY] Sent via Dealership Mail Hub. Recipient: ${payload.recipient}. Response: 250 2.0.0 Ok: queued as dlp-${Date.now().toString(36)}`;
    } else if (isSms) {
      deliveryNotes = `[DEMO GSM/DLT GATEWAY] Carrier: Telecom India (DLT Header: APEXMO). Recipient: ${payload.recipient}. Delivery Status: Handset Delivered (Latency: 280ms)`;
    } else if (isWhatsApp) {
      deliveryNotes = `[DEMO WHATSAPP BUSINESS API] Template: vehicle_service_alert_v1. Recipient: ${payload.recipient}. Status: Read Receipt Received`;
    }

    const notif = await db.addNotification({
      reminderId: payload.reminderId,
      vehicleId: payload.vehicleId,
      customerId: payload.customerId,
      showroomId: payload.showroomId,
      type: payload.type,
      channel: payload.channel,
      recipient: payload.recipient,
      subject: payload.subject,
      message: payload.message,
      status: status,
      mode: 'DEMO_SANDBOX',
      sentAt: new Date().toISOString(),
      deliveryNotes: deliveryNotes
    });

    return notif;
  }

  /**
   * Generates a template preview message for vehicle reminders
   */
  public generateTemplate(
    type: 'SERVICE' | 'INSURANCE' | 'PUC' | 'CUSTOM',
    channel: NotificationChannel,
    data: {
      customerName: string;
      vehicleReg: string;
      brandModel: string;
      dueDate: string;
      daysRemaining: number;
      showroomName: string;
      policyNumber?: string;
      docNumber?: string;
    }
  ): { subject: string; message: string } {
    const urgency = data.daysRemaining < 0
      ? 'OVERDUE NOTICE'
      : data.daysRemaining === 0
        ? 'DUE TODAY'
        : `Due in ${data.daysRemaining} Day${data.daysRemaining === 1 ? '' : 's'}`;

    if (type === 'SERVICE') {
      if (channel === 'EMAIL') {
        return {
          subject: `${urgency}: Periodic Service for your ${data.brandModel} (${data.vehicleReg})`,
          message: `Dear ${data.customerName},\n\nGreetings from ${data.showroomName}!\n\nThis is an automated reminder regarding your ${data.brandModel} (Registration No: ${data.vehicleReg}). Your periodic vehicle servicing is scheduled for ${data.dueDate} (${urgency}).\n\nRegular servicing preserves your engine life, warranty validity, and fuel economy. Book your priority service bay slot today by contacting our customer desk.\n\nWarm Regards,\nService Advisory Team, ${data.showroomName}`
        };
      } else {
        return {
          subject: `Service Reminder: ${data.vehicleReg}`,
          message: `${data.showroomName}: Dear ${data.customerName}, your ${data.brandModel} (${data.vehicleReg}) service is ${urgency} (Due: ${data.dueDate}). Call us or visit dealership portal to confirm booking.`
        };
      }
    } else if (type === 'INSURANCE') {
      if (channel === 'EMAIL') {
        return {
          subject: `${urgency}: Motor Insurance Renewal for ${data.brandModel} (${data.vehicleReg})`,
          message: `Dear ${data.customerName},\n\nYour motor insurance policy (${data.policyNumber || 'Active Policy'}) for vehicle ${data.brandModel} (${data.vehicleReg}) is ${urgency} (Expiry Date: ${data.dueDate}).\n\nAvoid lapses and policy break-in charges by renewing seamlessly through ${data.showroomName} with zero-depreciation and roadside assistance benefits.\n\nRegards,\nInsurance Desk, ${data.showroomName}`
        };
      } else {
        return {
          subject: `Insurance Renewal: ${data.vehicleReg}`,
          message: `INSURANCE ALERT: Dear ${data.customerName}, policy for ${data.vehicleReg} is ${urgency} (${data.dueDate}). Contact ${data.showroomName} for instant renewal.`
        };
      }
    } else if (type === 'PUC') {
      return {
        subject: `${urgency}: PUC Certificate Expiry Alert for ${data.vehicleReg}`,
        message: `${data.showroomName}: Dear ${data.customerName}, Pollution Under Control (PUC) certificate for ${data.vehicleReg} is ${urgency} (Valid till ${data.dueDate}). Get it tested at our RTO-authorized testing facility.`
      };
    } else {
      return {
        subject: `Notice for vehicle ${data.vehicleReg}`,
        message: `Dear ${data.customerName}, this is a reminder from ${data.showroomName} regarding vehicle ${data.vehicleReg}. Due date: ${data.dueDate}.`
      };
    }
  }
}

export const notificationService = new NotificationService();
