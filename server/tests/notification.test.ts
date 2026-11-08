import test from 'node:test';
import assert from 'node:assert/strict';
import type { Notification } from '../../src/types';
import { NotificationService, type SendNotificationPayload } from '../services/notificationService';

const configuredEnv: NodeJS.ProcessEnv = {
  SMTP_HOST: 'smtp.example.test',
  SMTP_PORT: '587',
  SMTP_USER: 'mailer@example.test',
  SMTP_PASS: 'smtp-test-secret',
  FROM_EMAIL: 'RemindMe <reminders@example.test>'
};

const payload: SendNotificationPayload = {
  reminderId: 'reminder-1',
  vehicleId: 'vehicle-1',
  customerId: 'customer-1',
  showroomId: 'showroom-1',
  type: 'SERVICE_REMINDER',
  channel: 'EMAIL',
  recipient: 'customer@example.test',
  subject: 'Service due',
  message: 'Please schedule a service.'
};

function createRepository() {
  const notifications: Notification[] = [];
  return {
    notifications,
    async addNotification(data: Omit<Notification, 'id' | 'createdAt'>) {
      const item: Notification = { ...data, id: `notification-${notifications.length + 1}`, createdAt: new Date().toISOString() };
      notifications.unshift(item);
      return item;
    },
    async updateNotification(id: string, updates: Partial<Notification>) {
      const index = notifications.findIndex(item => item.id === id);
      if (index < 0) return undefined;
      notifications[index] = { ...notifications[index], ...updates };
      return notifications[index];
    }
  };
}

test('SMTP success records an accepted email without claiming inbox delivery', async () => {
  const repository = createRepository();
  let sent = 0;
  let transportOptions: any;
  const service = new NotificationService(repository, { ...configuredEnv }, options => {
    transportOptions = options;
    return {
      async sendMail(message) {
        sent++;
        assert.equal(message.from, configuredEnv.FROM_EMAIL);
        assert.equal(message.to, payload.recipient);
        assert.equal(message.subject, payload.subject);
        assert.equal(message.text, payload.message);
        return { accepted: [payload.recipient], rejected: [], messageId: '<test-message-id>', response: '250 queued' };
      }
    };
  });

  const result = await service.send(payload);
  assert.deepEqual(service.getSmtpStatus(), { configured: true, missing: [] });
  assert.equal(result.status, 'SENT');
  assert.equal(result.mode, 'LIVE');
  assert.match(result.deliveryNotes || '', /inbox delivery is not confirmed/);
  assert.equal(transportOptions.host, 'smtp.example.test');
  assert.equal(transportOptions.secure, false);
  assert.equal(sent, 1);
});

test('SMTP transport failure records FAILED and redacts credentials', async () => {
  const repository = createRepository();
  const service = new NotificationService(repository, { ...configuredEnv }, () => ({
    async sendMail() { throw new Error('Authentication rejected for mailer@example.test using smtp-test-secret'); }
  }));

  const result = await service.send(payload);
  assert.equal(result.status, 'FAILED');
  assert.match(result.deliveryNotes || '', /SMTP send failed/);
  assert.equal(result.deliveryNotes?.includes('smtp-test-secret'), false);
  assert.equal(result.deliveryNotes?.includes('mailer@example.test'), false);
});

test('missing SMTP configuration records failure and can be retried after configuration', async () => {
  const repository = createRepository();
  const env: NodeJS.ProcessEnv = { ...configuredEnv, SMTP_PASS: '' };
  let sends = 0;
  const service = new NotificationService(repository, env, () => ({
    async sendMail() {
      sends++;
      return { accepted: [payload.recipient], rejected: [] };
    }
  }));

  const failed = await service.send(payload);
  assert.deepEqual(service.getSmtpStatus(), { configured: false, missing: ['SMTP_PASS'] });
  assert.equal(failed.status, 'FAILED');
  assert.match(failed.deliveryNotes || '', /SMTP_PASS/);
  assert.equal(sends, 0);

  env.SMTP_PASS = configuredEnv.SMTP_PASS;
  const retried = await service.retry(failed.id);
  assert.equal(retried.status, 'SENT');
  assert.equal(retried.attemptCount, 2);
  assert.equal(sends, 1);
});

test('a reminder cannot send a duplicate successful email', async () => {
  const repository = createRepository();
  let sends = 0;
  const service = new NotificationService(repository, { ...configuredEnv }, () => ({
    async sendMail() {
      sends++;
      return { accepted: [payload.recipient], rejected: [] };
    }
  }));

  const first = await service.send(payload);
  const duplicate = await service.send(payload);
  assert.equal(first.status, 'SENT');
  assert.equal(duplicate.id, first.id);
  assert.equal(repository.notifications.length, 1);
  assert.equal(sends, 1);
});
