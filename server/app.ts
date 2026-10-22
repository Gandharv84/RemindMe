import express from 'express';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import { apiRouter } from './routes/api';

export async function createApp(options: { serveFrontend?: boolean } = {}) {
  const app = express();
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use('/api', apiRouter);
  app.get('/api/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString(), app: 'RemindMe Backend' }));

  if (options.serveFrontend === false) return app;
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[API Error]', err);
    if (!res.headersSent) res.status(500).json({ error: 'Internal server error' });
  });
  return app;
}
