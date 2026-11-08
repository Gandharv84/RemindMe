// Tests must never inherit a developer's configured database URL.
process.env.DATABASE_URL = '';
process.env.ALLOW_IN_MEMORY_DEMO = '';
process.env.NODE_ENV = 'test';
