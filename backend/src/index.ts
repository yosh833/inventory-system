import Fastify from 'fastify';
import { db, seedDatabase } from './memory';
import { authRoutes } from './routes/auth.routes';
import { productRoutes } from './routes/product.routes';
import { saleRoutes } from './routes/sale.routes';
import { purchaseRoutes } from './routes/purchase.routes';
import { clientRoutes } from './routes/client.routes';
import { voiceRoutes } from './routes/voice.routes';
import { reportRoutes } from './routes/report.routes';
import { errorHandler } from './utils/errors';
import { authMiddleware } from './middleware/auth';

const app = Fastify({
  logger: {
    transport: {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'HH:MM:ss Z', ignore: 'pid,hostname' }
    }
  }
});

// Register plugins
await app.register(import('@fastify/cors'), {
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
});

await app.register(import('@fastify/cookie'), {
  secret: process.env.COOKIE_SECRET || 'cookie-secret-change-in-production',
  hook: 'onRequest'
});

await app.register(import('@fastify/rate-limit'), {
  max: 100,
  timeWindow: '1 minute'
});

await app.register(import('@fastify/jwt'), {
  secret: process.env.JWT_SECRET || 'inventory-secret-key-change-in-production',
  sign: { expiresIn: '8h' },
  verify: { algorithms: ['HS256'] }
});

// Global error handler
app.setErrorHandler(errorHandler);

// Health check
app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

// Register routes with prefixes
await app.register(authRoutes, { prefix: '/api/auth' });
await app.register(productRoutes, { prefix: '/api/products' });
await app.register(saleRoutes, { prefix: '/api/sales' });
await app.register(purchaseRoutes, { prefix: '/api/purchases' });
await app.register(clientRoutes, { prefix: '/api/clients' });
await app.register(voiceRoutes, { prefix: '/api/voice' });
await app.register(reportRoutes, { prefix: '/api/reports' });

// 404 handler
app.setNotFoundHandler((request, reply) => {
  reply.code(404).send({ success: false, error: 'NOT_FOUND', message: 'Ruta no encontrada' });
});

// Initialize database
await seedDatabase();

const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3001');
    await app.listen({ port, host: '0.0.0.0' });
    console.log(`🚀 Server running on http://localhost:${port}`);
    console.log(`📚 API docs available at http://localhost:${port}/api/docs (if swagger added)`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();