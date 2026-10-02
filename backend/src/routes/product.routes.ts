import { FastifyInstance } from 'fastify';
import { ProductService } from '../services/product.service';
import { createProductSchema, updateProductSchema, paginationSchema, createCategorySchema, createAdjustmentSchema } from '../utils/validation';
import { authMiddleware, requireOperatorOrAdmin, requireAdmin } from '../middleware/auth';
import { TransactionType } from '../types';

const productService = new ProductService();

export async function productRoutes(app: FastifyInstance) {
  // Categories
  app.get('/categories', { preHandler: authMiddleware }, async (request, reply) => {
    const categories = await productService.getCategories();
    return reply.send({ success: true, data: categories });
  });

  app.post('/categories', { preHandler: [authMiddleware, requireAdmin] }, async (request, reply) => {
    const data = createCategorySchema.parse(request.body);
    const category = await productService.createCategory(data);
    return reply.code(201).send({ success: true, data: category });
  });

  // Products
  app.get('/products', { preHandler: authMiddleware }, async (request, reply) => {
    const params = paginationSchema.parse(request.query);
    const { categoryId, isActive, lowStock } = request.query as any;
    const result = await productService.getProducts({
      page: params.page,
      pageSize: params.pageSize,
      search: params.search,
      categoryId,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      lowStock: lowStock === 'true'
    });
    return reply.send({ success: true, ...result });
  });

  app.get('/products/low-stock', { preHandler: authMiddleware }, async (request, reply) => {
    const alerts = await productService.getLowStock();
    return reply.send({ success: true, data: alerts });
  });

  app.get('/products/search/:code', { preHandler: authMiddleware }, async (request, reply) => {
    const { code } = request.params as { code: string };
    const product = await productService.getProductBySkuOrBarcode(code);
    return reply.send({ success: true, data: product });
  });

  app.get('/products/:id', { preHandler: authMiddleware }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const product = await productService.getProductById(id);
    return reply.send({ success: true, data: product });
  });

  app.post('/products', { preHandler: [authMiddleware, requireAdmin] }, async (request, reply) => {
    const data = createProductSchema.parse(request.body);
    const product = await productService.createProduct(data);
    return reply.code(201).send({ success: true, data: product });
  });

  app.put('/products/:id', { preHandler: [authMiddleware, requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = updateProductSchema.parse(request.body);
    const product = await productService.updateProduct(id, data);
    return reply.send({ success: true, data: product });
  });

  app.delete('/products/:id', { preHandler: [authMiddleware, requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await productService.deleteProduct(id);
    return reply.send({ success: true, message: 'Producto desactivado' });
  });

  // Stock adjustment
  app.post('/products/:id/adjust', { preHandler: [authMiddleware, requireOperatorOrAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = createAdjustmentSchema.parse(request.body);
    const result = await productService.adjustStock(
      id, 
      data.quantity, 
      data.reason, 
      request.user!.userId, 
      data.reference
    );
    return reply.send({ success: true, data: result });
  });
}