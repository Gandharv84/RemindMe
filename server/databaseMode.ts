export type DatabaseMode = 'POSTGRES' | 'IN_MEMORY_DEMO';

/** In-memory seed data is available only by explicit, non-production opt-in. */
export function resolveDatabaseMode(env: NodeJS.ProcessEnv = process.env): DatabaseMode {
  if (env.DATABASE_URL?.trim()) return 'POSTGRES';
  if (env.ALLOW_IN_MEMORY_DEMO === 'true' && env.NODE_ENV !== 'production') return 'IN_MEMORY_DEMO';
  throw new Error('DATABASE_URL is required. Set ALLOW_IN_MEMORY_DEMO=true only for an intentional non-production demo session.');
}
