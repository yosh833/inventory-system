import { FastifyInstance } from 'fastify';
import { VoiceService } from '../services/voice.service';
import { SaleService } from '../services/sale.service';
import { PurchaseService } from '../services/purchase.service';
import { ProductService } from '../services/product.service';
import { ReportService } from '../services/report.service';
import { voiceCommandSchema } from '../utils/validation';
import { authMiddleware, requireOperatorOrAdmin } from '../middleware/auth';
import { PaymentMethod, TransactionStatus } from '../types';

const voiceService = new VoiceService();
const saleService = new SaleService();
const purchaseService = new PurchaseService();
const productService = new ProductService();
const reportService = new ReportService();

export async function voiceRoutes(app: FastifyInstance) {
  // Process voice command (text input for now - audio would be multipart)
  app.post('/voice/command', { preHandler: [authMiddleware, requireOperatorOrAdmin] }, async (request, reply) => {
    const { parsedCommand, confirm } = voiceCommandSchema.parse(request.body);
    const operatorId = request.user!.userId;

    try {
      let result: any = {};
      let requiresConfirmation = parsedCommand.requiresConfirmation && !confirm;

      switch (parsedCommand.intent) {
        case 'CREATE_SALE': {
          if (requiresConfirmation) {
            // Return preview for confirmation
            const product = await findProduct(parsedCommand.entities.product!);
            const client = parsedCommand.entities.client 
              ? await findClient(parsedCommand.entities.client) 
              : null;
            
            if (!product) {
              return reply.code(404).send({ success: false, error: 'PRODUCT_NOT_FOUND', message: `Producto no encontrado: ${parsedCommand.entities.product}` });
            }

            const qty = parsedCommand.entities.quantity || 1;
            const price = parsedCommand.entities.price || product.salePrice;
            const discount = parsedCommand.entities.discount || 0;
            const net = price * qty * (1 - discount / 100);
            const tax = net * product.taxRate;
            const total = net + tax;

            return reply.send({
              success: true,
              requiresConfirmation: true,
              preview: {
                type: 'SALE',
                message: `Confirmar venta: ${qty} ${product.name}${client ? ` a ${client.fullName}` : ''} - Total: $${total.toFixed(2)}`,
                summary: { product: product.name, quantity: qty, client: client?.fullName, total }
              },
              voiceCommandId: `voice-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
            });
          }

          // Execute sale
          const saleResult = await executeVoiceSale(parsedCommand, operatorId);
          return reply.send({ success: true, data: saleResult, message: `Venta registrada: ${saleResult.sale.folio}` });
        }

        case 'CREATE_PURCHASE': {
          if (requiresConfirmation) {
            const product = await findProduct(parsedCommand.entities.product!);
            const supplier = parsedCommand.entities.supplier 
              ? await findSupplier(parsedCommand.entities.supplier) 
              : null;
            
            if (!product) {
              return reply.code(404).send({ success: false, error: 'PRODUCT_NOT_FOUND', message: `Producto no encontrado: ${parsedCommand.entities.product}` });
            }

            const qty = parsedCommand.entities.quantity || 1;
            const cost = parsedCommand.entities.cost || product.costPrice;
            const total = cost * qty * 1.16;

            return reply.send({
              success: true,
              requiresConfirmation: true,
              preview: {
                type: 'PURCHASE',
                message: `Confirmar compra: ${qty} ${product.name}${supplier ? ` al proveedor ${supplier.name}` : ''} - Total estimado: $${total.toFixed(2)}`,
                summary: { product: product.name, quantity: qty, supplier: supplier?.name, total }
              },
              voiceCommandId: `voice-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
            });
          }

          const purchaseResult = await executeVoicePurchase(parsedCommand, operatorId);
          return reply.send({ success: true, data: purchaseResult, message: `Compra registrada: ${purchaseResult.folio}` });
        }

        case 'CHECK_STOCK': {
          const product = await findProduct(parsedCommand.entities.product!);
          if (!product) {
            return reply.code(404).send({ success: false, error: 'PRODUCT_NOT_FOUND', message: `Producto no encontrado: ${parsedCommand.entities.product}` });
          }
          const inv = (await import('../memory')).db.inventory.get(product.id);
          return reply.send({
            success: true,
            data: {
              product: product.name,
              sku: product.sku,
              available: inv?.quantity || 0,
              reserved: inv?.reservedQty || 0,
              minStock: product.minStock
            },
            message: `${product.name}: ${inv?.quantity || 0} disponibles (mín: ${product.minStock})`
          });
        }

        case 'SEARCH_PRODUCT': {
          const query = parsedCommand.entities.query || parsedCommand.rawText;
          const products = (await import('../memory')).db.findMany(
            (await import('../memory')).db.products, 
            p => p.isActive && p.name.toLowerCase().includes(query.toLowerCase())
          ).slice(0, 10);
          
          return reply.send({
            success: true,
            data: products.map(p => ({ id: p.id, name: p.name, sku: p.sku, price: p.salePrice })),
            message: `Encontrados ${products.length} productos`
          });
        }

        case 'GET_REPORT': {
          const report = await executeVoiceReport(parsedCommand);
          return reply.send({ success: true, data: report, message: 'Reporte generado' });
        }

        default:
          return reply.code(400).send({ success: false, error: 'INTENT_NOT_SUPPORTED', message: 'Comando no reconocido' });
      }
    } catch (error: any) {
      request.log.error(error);
      return reply.code(400).send({ success: false, error: error.code || 'VOICE_ERROR', message: error.message });
    }
  });

  // Text command endpoint (for testing without audio)
  app.post('/voice/text', { preHandler: [authMiddleware, requireOperatorOrAdmin] }, async (request, reply) => {
    const { text } = request.body as { text: string };
    if (!text) {
      return reply.code(400).send({ success: false, error: 'TEXT_REQUIRED' });
    }
    const parsed = voiceService.parseCommand(text);
    return reply.send({ success: true, data: parsed });
  });

  // Get supported commands help
  app.get('/voice/help', { preHandler: authMiddleware }, async (request, reply) => {
    return reply.send({
      success: true,
      data: {
        commands: [
          { intent: 'CREATE_SALE', examples: ['vender 3 tornillos M8 a cliente Juan Pérez', 'venta de 5 martillos a María a 150 pesos', 'registrar salida 10 cables calibre 12'] },
          { intent: 'CREATE_PURCHASE', examples: ['comprar 50 varillas 3/8 al proveedor Aceros del Norte', 'orden de compra 20 cemento gris proveedor Cemex a 180'] },
          { intent: 'CHECK_STOCK', examples: ['cuánto hay de pintura blanca', 'stock de tornillos M8', 'disponible martillo 500g'] },
          { intent: 'SEARCH_PRODUCT', examples: ['buscar tornillos acero', 'encontrar pintura roja'] },
          { intent: 'GET_REPORT', examples: ['reporte de ventas de hoy', 'productos más vendidos esta semana', 'stock crítico'] }
        ],
        tips: [
          'Especifica cantidad, producto y cliente/proveedor',
          'Puedes añadir precio: "a 150 pesos"',
          'Puedes añadir descuento: "con 10 por ciento descuento"',
          'Método de pago: "efectivo", "tarjeta", "transferencia", "crédito"',
          'Fechas relativas: "hoy", "ayer", "esta semana", "este mes"'
        ]
      }
    });
  });

  async function findProduct(query: string) {
    const products = (await import('../memory')).db.findMany(
      (await import('../memory')).db.products,
      p => p.isActive && (
        p.sku.toLowerCase() === query.toLowerCase() ||
        p.barcode?.toLowerCase() === query.toLowerCase() ||
        p.name.toLowerCase().includes(query.toLowerCase())
      )
    );
    return products[0] || null;
  }

  async function findClient(query: string) {
    return (await import('../memory')).db.findMany(
      (await import('../memory')).db.clients,
      c => c.isActive && (
        c.code.toLowerCase() === query.toLowerCase() ||
        c.fullName.toLowerCase().includes(query.toLowerCase()) ||
        c.phone?.includes(query) ||
        c.email?.toLowerCase().includes(query.toLowerCase())
      )
    )[0] || null;
  }

  async function findSupplier(query: string) {
    return (await import('../memory')).db.findMany(
      (await import('../memory')).db.suppliers,
      s => s.isActive && (
        s.code.toLowerCase() === query.toLowerCase() ||
        s.name.toLowerCase().includes(query.toLowerCase())
      )
    )[0] || null;
  }

  async function executeVoiceSale(parsed: any, operatorId: string) {
    const product = await findProduct(parsed.entities.product!);
    const client = parsed.entities.client ? await findClient(parsed.entities.client) : null;

    const saleData = {
      items: [{
        productId: product!.id,
        quantity: parsed.entities.quantity || 1,
        unitPrice: parsed.entities.price,
        discountPct: parsed.entities.discount
      }],
      clientId: client?.id,
      paymentMethod: parsed.entities.paymentMethod || PaymentMethod.CASH,
      payments: [{ 
        method: parsed.entities.paymentMethod || PaymentMethod.CASH, 
        amount: 0 // Will be calculated
      }],
      notes: `Venta por voz: "${parsed.rawText}"`,
      source: 'VOICE' as const,
      voiceCommandId: `voice-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    // Calculate total for payment
    const price = parsed.entities.price || product!.salePrice;
    const qty = parsed.entities.quantity || 1;
    const discount = parsed.entities.discount || 0;
    const net = price * qty * (1 - discount / 100);
    const tax = net * product!.taxRate;
    const total = net + tax;
    saleData.payments[0].amount = total;

    return await saleService.createSale(saleData, operatorId);
  }

  async function executeVoicePurchase(parsed: any, operatorId: string) {
    const product = await findProduct(parsed.entities.product!);
    const supplier = parsed.entities.supplier ? await findSupplier(parsed.entities.supplier) : null;

    if (!supplier) throw new Error('Proveedor requerido para compras');

    const purchaseData = {
      supplierId: supplier.id,
      items: [{
        productId: product!.id,
        quantityOrdered: parsed.entities.quantity || 1,
        unitCost: parsed.entities.cost || product!.costPrice,
        taxRate: product!.taxRate
      }],
      expectedDate: parsed.entities.expectedDate,
      notes: `Compra por voz: "${parsed.rawText}"`,
      source: 'VOICE' as const,
      voiceCommandId: `voice-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    return await purchaseService.createPurchase(purchaseData, operatorId);
  }

  async function executeVoiceReport(parsed: any) {
    const { from, to } = parsed.entities.dateRange || { 
      from: new Date(Date.now() - 30 * 86400000), 
      to: new Date() 
    };

    switch (parsed.entities.reportType) {
      case 'SALES': return reportService.getSalesReport({ from, to });
      case 'PURCHASES': return reportService.getPurchasesReport({ from, to });
      case 'TOP_PRODUCTS': return reportService.getTopProductsReport({ from, to, limit: 10 });
      case 'LOW_STOCK': return reportService.getLowStockReport();
      case 'CASH_FLOW': return reportService.getCashFlowReport({ from, to });
      default: return reportService.getSalesReport({ from, to });
    }
  }
}