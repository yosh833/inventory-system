import { FastifyInstance } from 'fastify';
import { PurchaseService } from '../services/purchase.service';
import { createPurchaseSchema, paginationSchema } from '../utils/validation';
import { authMiddleware, requireOperatorOrAdmin } from '../middleware/auth';
import { TransactionStatus } from '../types';

const purchaseService = new PurchaseService();

export async function purchaseRoutes(app: FastifyInstance) {
  // Suppliers
  app.get('/suppliers', { preHandler: authMiddleware }, async (request, reply) => {
    const suppliers = await purchaseService.getSuppliers();
    return reply.send({ success: true, data: suppliers });
  });

  app.post('/suppliers', { preHandler: [authMiddleware, requireOperatorOrAdmin] }, async (request, reply) => {
    const { name, contactName, email, phone, address, taxId, paymentTerms } = request.body as any;
    if (!name) {
      return reply.code(400).send({ success: false, error: 'NAME_REQUIRED', message: 'Nombre del proveedor requerido' });
    }
    const supplier = await purchaseService.createSupplier({ name, contactName, email, phone, address, taxId, paymentTerms });
    return reply.code(201).send({ success: true, data: supplier });
  });

  // Purchases
  app.get('/purchases', { preHandler: authMiddleware }, async (request, reply) => {
    const params = paginationSchema.parse(request.query);
    const { status, supplierId, operatorId, dateFrom, dateTo } = request.query as any;
    
    const userOperatorId = request.user!.role === 'ADMIN' ? (operatorId || undefined) : request.user!.userId;
    
    const result = await purchaseService.getPurchases({
      page: params.page,
      pageSize: params.pageSize,
      search: params.search,
      status: status as TransactionStatus,
      supplierId,
      operatorId: userOperatorId,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined
    });
    return reply.send({ success: true, ...result });
  });

  app.get('/purchases/:id', { preHandler: authMiddleware }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const purchase = await purchaseService.getPurchaseById(id);
    
    if (request.user!.role !== 'ADMIN' && purchase.operatorId !== request.user!.userId) {
      return reply.code(403).send({ success: false, error: 'FORBIDDEN' });
    }
    
    return reply.send({ success: true, data: purchase });
  });

  app.post('/purchases', { preHandler: [authMiddleware, requireOperatorOrAdmin] }, async (request, reply) => {
    const data = createPurchaseSchema.parse(request.body);
    const purchase = await purchaseService.createPurchase(data, request.user!.userId);
    return reply.code(201).send({ success: true, data: purchase });
  });

  app.post('/purchases/:id/receive', { preHandler: [authMiddleware, requireOperatorOrAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { items } = request.body as { items: { itemId: string; quantityReceived: number }[] };
    if (!items || !items.length) {
      return reply.code(400).send({ success: false, error: 'ITEMS_REQUIRED', message: 'Se requieren items para recibir' });
    }
    const result = await purchaseService.receivePurchase(id, request.user!.userId, items);
    return reply.send({ success: true, data: result });
  });
}