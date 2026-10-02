import { FastifyInstance } from 'fastify';
import { ReportService } from '../services/report.service';
import { authMiddleware, requireOperatorOrAdmin } from '../middleware/auth';
import { TransactionStatus, PaymentMethod } from '../types';

const reportService = new ReportService();

export async function reportRoutes(app: FastifyInstance) {
  app.get('/reports/dashboard', { preHandler: authMiddleware }, async (request, reply) => {
    const stats = await reportService.getDashboardStats();
    return reply.send({ success: true, data: stats });
  });

  app.get('/reports/sales', { preHandler: authMiddleware }, async (request, reply) => {
    const { from, to, operatorId, clientId, paymentMethod } = request.query as any;
    const data = await reportService.getSalesReport({
      from: from ? new Date(from) : new Date(Date.now() - 30 * 86400000),
      to: to ? new Date(to) : new Date(),
      operatorId: request.user!.role === 'ADMIN' ? operatorId : request.user!.userId,
      clientId,
      paymentMethod: paymentMethod as PaymentMethod
    });
    return reply.send({ success: true, data });
  });

  app.get('/reports/purchases', { preHandler: authMiddleware }, async (request, reply) => {
    const { from, to, supplierId } = request.query as any;
    const data = await reportService.getPurchasesReport({
      from: from ? new Date(from) : new Date(Date.now() - 30 * 86400000),
      to: to ? new Date(to) : new Date(),
      supplierId
    });
    return reply.send({ success: true, data });
  });

  app.get('/reports/top-products', { preHandler: authMiddleware }, async (request, reply) => {
    const { from, to, limit } = request.query as any;
    const data = await reportService.getTopProductsReport({
      from: from ? new Date(from) : new Date(Date.now() - 30 * 86400000),
      to: to ? new Date(to) : new Date(),
      limit: limit ? parseInt(limit) : 20
    });
    return reply.send({ success: true, data });
  });

  app.get('/reports/low-stock', { preHandler: authMiddleware }, async (request, reply) => {
    const data = await reportService.getLowStockReport();
    return reply.send({ success: true, data });
  });

  app.get('/reports/cash-flow', { preHandler: authMiddleware }, async (request, reply) => {
    const { from, to } = request.query as any;
    const data = await reportService.getCashFlowReport({
      from: from ? new Date(from) : new Date(Date.now() - 30 * 86400000),
      to: to ? new Date(to) : new Date()
    });
    return reply.send({ success: true, data });
  });

  app.get('/reports/kardex/:productId', { preHandler: authMiddleware }, async (request, reply) => {
    const { productId } = request.params as { productId: string };
    const { from, to } = request.query as any;
    const data = await reportService.getKardex(productId, {
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined
    });
    return reply.send({ success: true, data });
  });

  // Export endpoints (return CSV data)
  app.get('/reports/export/sales', { preHandler: authMiddleware }, async (request, reply) => {
    const { from, to } = request.query as any;
    const report = await reportService.getSalesReport({
      from: from ? new Date(from) : new Date(Date.now() - 30 * 86400000),
      to: to ? new Date(to) : new Date()
    });
    
    const { db } = await import('../memory');
    const csv = [
      ['Folio', 'Fecha', 'Cliente', 'Operador', 'Subtotal', 'IVA', 'Total', 'Método Pago', 'Estado'].join(','),
      ...report.sales.map(s => [
        s.folio,
        s.createdAt.toISOString(),
        s.clientId ? db.clients.get(s.clientId)?.fullName || '' : 'Público',
        db.users.get(s.operatorId)?.fullName || '',
        s.subtotal.toFixed(2),
        s.taxAmount.toFixed(2),
        s.total.toFixed(2),
        s.paymentMethod,
        s.status
      ].join(','))
    ].join('\n');

    reply.header('Content-Type', 'text/csv');
    reply.header('Content-Disposition', `attachment; filename="ventas-${new Date().toISOString().split('T')[0]}.csv"`);
    return reply.send(csv);
  });
}