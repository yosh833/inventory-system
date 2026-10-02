import { FastifyInstance } from 'fastify';
import { SaleService } from '../services/sale.service';
import { createSaleSchema, paginationSchema } from '../utils/validation';
import { authMiddleware, requireOperatorOrAdmin } from '../middleware/auth';
import { TransactionStatus, PaymentMethod } from '../types';

const saleService = new SaleService();

export async function saleRoutes(app: FastifyInstance) {
  app.get('/sales', { preHandler: authMiddleware }, async (request, reply) => {
    const params = paginationSchema.parse(request.query);
    const { status, operatorId, clientId, dateFrom, dateTo } = request.query as any;
    
    // Operators can only see their own sales unless admin
    const userOperatorId = request.user!.role === 'ADMIN' ? (operatorId || undefined) : request.user!.userId;
    
    const result = await saleService.getSales({
      page: params.page,
      pageSize: params.pageSize,
      search: params.search,
      status: status as TransactionStatus,
      operatorId: userOperatorId,
      clientId,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined
    });
    return reply.send({ success: true, ...result });
  });

  app.get('/sales/stats', { preHandler: authMiddleware }, async (request, reply) => {
    const operatorId = request.user!.role === 'ADMIN' ? undefined : request.user!.userId;
    const stats = await saleService.getTodaysStats(operatorId);
    return reply.send({ success: true, data: stats });
  });

  app.get('/sales/:id', { preHandler: authMiddleware }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const sale = await saleService.getSaleById(id);
    
    // Check permissions
    if (request.user!.role !== 'ADMIN' && sale.operatorId !== request.user!.userId) {
      return reply.code(403).send({ success: false, error: 'FORBIDDEN' });
    }
    
    return reply.send({ success: true, data: sale });
  });

  app.post('/sales', { preHandler: [authMiddleware, requireOperatorOrAdmin] }, async (request, reply) => {
    const data = createSaleSchema.parse(request.body);
    const result = await saleService.createSale(data, request.user!.userId);
    return reply.code(201).send({ success: true, data: result });
  });

  app.post('/sales/:id/cancel', { preHandler: [authMiddleware, requireOperatorOrAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { reason } = request.body as { reason: string };
    if (!reason) {
      return reply.code(400).send({ success: false, error: 'REASON_REQUIRED', message: 'Se requiere motivo de cancelación' });
    }
    await saleService.cancelSale(id, request.user!.userId, reason);
    return reply.send({ success: true, message: 'Venta cancelada' });
  });
}