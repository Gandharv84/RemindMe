import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveDatabaseMode } from '../databaseMode';

test('normal startup requires PostgreSQL instead of silently using memory', () => {
  assert.throws(() => resolveDatabaseMode({ NODE_ENV: 'development' }), /DATABASE_URL is required/);
  assert.equal(resolveDatabaseMode({ NODE_ENV: 'development', DATABASE_URL: 'postgres://db.example.test/remindme' }), 'POSTGRES');
});

test('in-memory seed data requires explicit non-production demo opt-in', () => {
  assert.equal(resolveDatabaseMode({ NODE_ENV: 'development', ALLOW_IN_MEMORY_DEMO: 'true' }), 'IN_MEMORY_DEMO');
  assert.throws(() => resolveDatabaseMode({ NODE_ENV: 'production', ALLOW_IN_MEMORY_DEMO: 'true' }), /DATABASE_URL is required/);
});
