import 'dotenv/config';
import { createApp } from './server/app';
import { db } from './server/db';
import { closePool } from './server/postgres';
import { reminderEngine } from './server/services/reminderEngine';

async function startServer() {
  await db.initialize();
  const app = await createApp();
  const port = Number(process.env.PORT || 3000);
  const listener = app.listen(port, '0.0.0.0', () => {
    console.log(`[RemindMe Server] Listening on http://0.0.0.0:${port}`);
  });

  void reminderEngine.run().catch(error => console.error('[Reminder Engine]', error));
  const reminderTimer = setInterval(() => {
    void reminderEngine.run().catch(error => console.error('[Reminder Engine]', error));
  }, 15 * 60 * 1000);
  reminderTimer.unref();

  const shutdown = async () => {
    clearInterval(reminderTimer);
    listener.close(async () => { await closePool(); process.exit(0); });
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

startServer().catch(error => {
  console.error('[RemindMe startup failed]', error);
  process.exit(1);
});
