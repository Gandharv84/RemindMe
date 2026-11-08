import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { createSessionToken, hashPassword, safeCustomer, verifyPassword, verifySessionToken } from '../security';
import { currentMonthRange, isDate, isRecord } from '../validation';

test('password hashes are salted and verification rejects wrong passwords', async () => {
  const first = await hashPassword('long-customer-password');
  const second = await hashPassword('long-customer-password');
  assert.notEqual(first, second);
  assert.equal(await verifyPassword('long-customer-password', first), true);
  assert.equal(await verifyPassword('wrong-password', first), false);
  assert.equal(await verifyPassword('anything', 'admin123'), false);
});

test('legacy bcrypt password hashes remain verifiable after import', async () => {
  const legacyHash = await bcrypt.hash('legacy-password', 4);
  assert.equal(await verifyPassword('legacy-password', legacyHash), true);
  assert.equal(await verifyPassword('wrong-password', legacyHash), false);
});

test('signed sessions enforce their signature and expiry', () => {
  process.env.SESSION_SECRET = 'test-only-session-secret-0123456789';
  const token = createSessionToken({ id: 'u1', role: 'CUSTOMER', showroomId: 'sh-1' }, 1_000_000);
  assert.equal(verifySessionToken(token, 1_000_001)?.id, 'u1');
  assert.equal(verifySessionToken(`${token}x`, 1_000_001), null);
  assert.equal(verifySessionToken(token, 5_000_000), null);
});

test('public customer serialization omits password hashes', () => {
  const safe = safeCustomer({ id: 'c1', name: 'Customer', passwordHash: 'secret' });
  assert.equal('passwordHash' in safe, false);
});

test('schema helpers reject malformed bodies and impossible calendar dates', () => {
  assert.equal(isRecord([]), false);
  assert.equal(isDate('2026-02-28'), true);
  assert.equal(isDate('2026-02-30'), false);
});

test('revenue month bounds use the calendar month', () => {
  const { start, end } = currentMonthRange(new Date(2026, 9, 22));
  assert.deepEqual([start.getFullYear(), start.getMonth(), start.getDate()], [2026, 9, 1]);
  assert.deepEqual([end.getFullYear(), end.getMonth(), end.getDate()], [2026, 10, 1]);
});
