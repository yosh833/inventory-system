import { FastifyInstance } from 'fastify';
import { ClientService } from '../services/client.service';
import { createClientSchema, updateClientSchema, paginationSchema } from '../utils/validation';
import { authMiddleware, requireAdmin, requireOperatorOrAdmin } from '../middleware/auth';

const clientService = new ClientService();

export async function clientRoutes(app: FastifyInstance) {
  app.get('/clients', { preHandler: authMiddleware }, async (request, reply) => {
    const params = paginationSchema.parse(request.query);
    const { isActive } = request.query as any;
    const result = await clientService.getClients({
      page: params.page,
      pageSize: params.pageSize,
      search: params.search,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined
    });
    return reply.send({ success: true, ...result });
  });

  app.get('/clients/:id', { preHandler: authMiddleware }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const client = await clientService.getClientById(id);
    return reply.send({ success: true, data: client });
  });

  app.get('/clients/:id/balance', { preHandler: authMiddleware }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const balance = await clientService.getClientBalance(id);
    return reply.send({ success: true, data: balance });
  });

  app.post('/clients', { preHandler: [authMiddleware, requireAdmin] }, async (request, reply) => {
    const data = createClientSchema.parse(request.body);
    const client = await clientService.createClient(data);
    return reply.code(201).send({ success: true, data: client });
  });

  app.put('/clients/:id', { preHandler: [authMiddleware, requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = updateClientSchema.parse(request.body);
    const client = await clientService.updateClient(id, data);
    return reply.send({ success: true, data: client });
  });

  app.put('/clients/:id/toggle', { preHandler: [authMiddleware, requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const client = await clientService.toggleClientStatus(id);
    return reply.send({ success: true, data: client });
  });

  app.post('/clients/:id/payment', { preHandler: [authMiddleware, requireOperatorOrAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { amount, method, reference } = request.body as { amount: number; method: string; reference?: string };
    if (!amount || amount <= 0) {
      return reply.code(400).send({ success: false, error: 'INVALID_AMOUNT', message: 'Monto inválido' });
    }
    const result = await clientService.makePayment(id, amount, method, reference || '', request.user!.userId);
    return reply.send({ success: true, data: result });
  });
}