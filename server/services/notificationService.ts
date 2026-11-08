import nodemailer from 'nodemailer';
import { db } from '../db';
import type { Notification, NotificationChannel, ReminderCategory } from '../../src/types';

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

interface SmtpSettings {
  host: string;
  port: number;
  user: string;
  pass: string;
  fromEmail: string;
}

interface SmtpTransportOptions {
  host: string;
  port: number;
  secure: boolean;
  auth: { user: string; pass: string };
  connectionTimeout: number;
  greetingTimeout: number;
  socketTimeout: number;
}

interface SmtpSendResult {
  accepted?: unknown[];
  rejected?: unknown[];
  messageId?: string;
  response?: string;
}

interface MailTransport {
  sendMail(options: { from: string; to: string; subject: string; text: string }): Promise<SmtpSendResult>;
}

type TransportFactory = (options: SmtpTransportOptions) => MailTransport;
type NotificationRepository = Pick<typeof db, 'notifications' | 'addNotification' | 'updateNotification'>;

const smtpVariableNames = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'FROM_EMAIL'] as const;

function smtpSettings(env: NodeJS.ProcessEnv): { settings?: SmtpSettings; missing: string[] } {
  const missing = smtpVariableNames.filter(name => !env[name]?.trim());
  const port = Number(env.SMTP_PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    if (!missing.includes('SMTP_PORT')) missing.push('SMTP_PORT');
  }
  if (missing.length) return { missing };
  return {
    settings: {
      host: env.SMTP_HOST!.trim(),
      port,
      user: env.SMTP_USER!.trim(),
      pass: env.SMTP_PASS!,
      fromEmail: env.FROM_EMAIL!.trim()
    },
    missing: []
  };
}

function addressOf(value: unknown): string {
  if (typeof value === 'string') return value.toLowerCase();
  if (value && typeof value === 'object' && 'address' in value && typeof value.address === 'string') {
    return value.address.toLowerCase();
  }
  return '';
}

export class NotificationService {
  private readonly inFlightReminders = new Set<string>();

  constructor(
    private readonly repository: NotificationRepository = db,
    private readonly env: NodeJS.ProcessEnv = process.env,
    private readonly createTransport: TransportFactory = options => nodemailer.createTransport(options) as unknown as MailTransport
  ) {}

  public getSmtpStatus(): { configured: boolean; missing: string[] } {
    const { missing } = smtpSettings(this.env);
    return { configured: missing.length === 0, missing };
  }

  /** Send one real email through SMTP and retain the attempt, including configuration and transport failures. */
  public async send(payload: SendNotificationPayload): Promise<Notification> {
    if ((payload as { channel: unknown }).channel !== 'EMAIL') {
      throw new Error('Unsupported notification channel. Only EMAIL is supported.');
    }

    const key = payload.reminderId ? `${payload.reminderId}:${payload.type}` : undefined;
    if (key && this.inFlightReminders.has(key)) {
      throw new Error('An email for this reminder is already being processed.');
    }
    if (key) {
      const alreadySent = this.repository.notifications.find(notification =>
        notification.reminderId === payload.reminderId && notification.type === payload.type && notification.status === 'SENT'
      );
      if (alreadySent) return alreadySent;
      this.inFlightReminders.add(key);
    }

    try {
      const attemptTime = new Date().toISOString();
      const notification = await this.repository.addNotification({
        ...payload,
        channel: 'EMAIL',
        status: 'PENDING',
        mode: 'LIVE',
        sentAt: attemptTime,
        attemptCount: 1
      });
      return await this.deliver(notification, payload);
    } finally {
      if (key) this.inFlightReminders.delete(key);
    }
  }

  /** Retry an existing failed attempt in place; successful or in-progress records cannot be resent. */
  public async retry(notificationId: string): Promise<Notification> {
    const existing = this.repository.notifications.find(notification => notification.id === notificationId);
    if (!existing) throw new Error('Notification not found.');
    if (existing.channel !== 'EMAIL') throw new Error('Only email notifications can be retried.');
    if (existing.status !== 'FAILED') throw new Error('Only failed email notifications can be retried.');

    const key = existing.reminderId ? `${existing.reminderId}:${existing.type}` : undefined;
    if (key && this.inFlightReminders.has(key)) throw new Error('An email for this reminder is already being processed.');
    if (key) {
      const alreadySent = this.repository.notifications.find(notification =>
        notification.id !== existing.id && notification.reminderId === existing.reminderId &&
        notification.type === existing.type && notification.status === 'SENT'
      );
      if (alreadySent) throw new Error('This reminder already has a successful SMTP send.');
      this.inFlightReminders.add(key);
    }

    try {
      const attemptTime = new Date().toISOString();
      const pending = await this.repository.updateNotification(existing.id, {
        status: 'PENDING',
        mode: 'LIVE',
        sentAt: attemptTime,
        attemptCount: (existing.attemptCount || 1) + 1,
        deliveryNotes: 'Retry attempt is in progress.'
      });
      if (!pending) throw new Error('Notification could not be updated.');
      return await this.deliver(pending, existing);
    } finally {
      if (key) this.inFlightReminders.delete(key);
    }
  }

  private async deliver(notification: Notification, payload: Pick<SendNotificationPayload, 'recipient' | 'subject' | 'message'>): Promise<Notification> {
    const { settings, missing } = smtpSettings(this.env);
    if (!settings) {
      return this.markFailed(notification, `SMTP is not configured. Set ${missing.join(', ')} in the server environment, then retry this email.`);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.recipient)) {
      return this.markFailed(notification, 'The customer does not have a valid email address. Update the address, then retry this email.');
    }

    try {
      const transport = this.createTransport({
        host: settings.host,
        port: settings.port,
        secure: settings.port === 465,
        auth: { user: settings.user, pass: settings.pass },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 20000
      });
      const result = await transport.sendMail({
        from: settings.fromEmail,
        to: payload.recipient,
        subject: payload.subject,
        text: payload.message
      });
      const accepted = result.accepted?.some(address => addressOf(address) === payload.recipient.toLowerCase()) || false;
      const rejected = result.rejected?.some(address => addressOf(address) === payload.recipient.toLowerCase()) || false;
      if (!accepted || rejected) throw new Error('SMTP did not accept the recipient address.');

      const acceptedNotes = [
        'Accepted by SMTP server; inbox delivery is not confirmed.',
        result.messageId ? `Message ID: ${result.messageId}` : undefined,
        result.response ? `Response: ${result.response}` : undefined
      ].filter(Boolean).join(' ');
      return (await this.repository.updateNotification(notification.id, {
        status: 'SENT',
        sentAt: new Date().toISOString(),
        deliveryNotes: acceptedNotes
      })) || notification;
    } catch (error) {
      const message = this.safeErrorMessage(error, settings);
      return this.markFailed(notification, `SMTP send failed: ${message}`);
    }
  }

  private async markFailed(notification: Notification, details: string): Promise<Notification> {
    return (await this.repository.updateNotification(notification.id, {
      status: 'FAILED',
      sentAt: new Date().toISOString(),
      deliveryNotes: details
    })) || { ...notification, status: 'FAILED', deliveryNotes: details };
  }

  private safeErrorMessage(error: unknown, settings: SmtpSettings): string {
    const value = error instanceof Error ? error.message : 'Unknown SMTP error';
    return value
      .replaceAll(settings.pass, '[redacted]')
      .replaceAll(settings.user, '[redacted]')
      .replace(/[\r\n]+/g, ' ')
      .slice(0, 400);
  }

  /** Email templates for vehicle service, insurance, PUC and manual reminders. */
  public generateTemplate(
    type: ReminderCategory,
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
      return {
        subject: `${urgency}: Periodic Service for your ${data.brandModel} (${data.vehicleReg})`,
        message: `Dear ${data.customerName},\n\nGreetings from ${data.showroomName}!\n\nThis is an automated reminder regarding your ${data.brandModel} (Registration No: ${data.vehicleReg}). Your periodic vehicle servicing is scheduled for ${data.dueDate} (${urgency}).\n\nRegular servicing preserves your engine life, warranty validity, and fuel economy. Contact our customer desk to book a service bay slot.\n\nWarm regards,\nService Advisory Team, ${data.showroomName}`
      };
    }
    if (type === 'INSURANCE') {
      return {
        subject: `${urgency}: Motor Insurance Renewal for ${data.brandModel} (${data.vehicleReg})`,
        message: `Dear ${data.customerName},\n\nYour motor insurance policy (${data.policyNumber || 'Active Policy'}) for vehicle ${data.brandModel} (${data.vehicleReg}) is ${urgency} (Expiry Date: ${data.dueDate}).\n\nContact ${data.showroomName} to discuss renewal options and avoid a lapse in cover.\n\nRegards,\nInsurance Desk, ${data.showroomName}`
      };
    }
    if (type === 'PUC') {
      return {
        subject: `${urgency}: PUC Certificate Expiry Alert for ${data.vehicleReg}`,
        message: `Dear ${data.customerName},\n\nThe Pollution Under Control (PUC) certificate for your ${data.brandModel} (${data.vehicleReg}) is ${urgency} (valid till ${data.dueDate}). Please arrange a new test before expiry.\n\nRegards,\n${data.showroomName}`
      };
    }
    return {
      subject: `Notice for vehicle ${data.vehicleReg}`,
      message: `Dear ${data.customerName},\n\nThis is a reminder from ${data.showroomName} regarding vehicle ${data.vehicleReg}. Due date: ${data.dueDate}.\n\nRegards,\n${data.showroomName}`
    };
  }
}

export const notificationService = new NotificationService();
