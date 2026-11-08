import 'dotenv/config';
import { createApp } from './server/app';
import { db } from './server/db';
import { disconnectPrisma } from './server/prismaStore';
import { reminderEngine } from './server/services/reminderEngine';

async function startServer() {
  await db.initialize();
  const app = await createApp();
  const configuredPort = process.env.PORT?.trim() || '3000';
  const port = Number(configuredPort);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }
  const listener = app.listen(port, '0.0.0.0', () => {
    console.log(`[RemindMe Server] Listening on http://localhost:${port}`);
  });

  void reminderEngine.run().catch(error => console.error('[Reminder Engine]', error));
  const reminderTimer = setInterval(() => {
    void reminderEngine.run().catch(error => console.error('[Reminder Engine]', error));
  }, 15 * 60 * 1000);
  reminderTimer.unref();

  let shutdownStarted = false;
  const shutdown = async () => {
    if (shutdownStarted) return;
    shutdownStarted = true;
    clearInterval(reminderTimer);

    try {
      await new Promise<void>(resolve => {
        let finished = false;
        const finish = () => {
          if (finished) return;
          finished = true;
          clearTimeout(forceCloseTimer);
          resolve();
        };
        const forceCloseTimer = setTimeout(() => {
          listener.closeAllConnections();
          finish();
        }, 5_000);
        listener.close(finish);
      });
      await disconnectPrisma();
      process.exit(0);
    } catch (error) {
      console.error('[RemindMe shutdown failed]', error);
      await disconnectPrisma().catch(disconnectError => {
        console.error('[RemindMe] Could not release PostgreSQL lease during shutdown:', disconnectError);
      });
      process.exit(1);
    }
  };
  process.once('SIGINT', () => { void shutdown(); });
  process.once('SIGTERM', () => { void shutdown(); });
}

startServer().catch(async error => {
  console.error('[RemindMe startup failed]', error);
  await disconnectPrisma().catch(disconnectError => {
    console.error('[RemindMe] Could not release PostgreSQL lease after startup failure:', disconnectError);
  });
  process.exit(1);
});
