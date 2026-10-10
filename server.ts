import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { apiRouter } from './server/api-router';
import { setupWebSockets } from './server/websocket';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = http.createServer(app);

  app.use(express.json());

  // API Routes mounted directly on Express
  app.use('/api', apiRouter);

  // Health check
  app.get(['/health', '/api/health'], (_req, res) => {
    res.json({ status: 'healthy', version: '2.0.0' });
  });

  // Setup WebSockets
  setupWebSockets(server);

  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false
      },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = parseInt(process.env.PORT || '3000', 10);
  const HOST = '0.0.0.0';

  server.listen(PORT, HOST, () => {
    console.log(`AI Receptionist full-stack server running at http://${HOST}:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
