import { db } from '../memory';
import { Sale, SaleItem, Client, Product, Inventory, User, Payment, InventoryAdjustment, TransactionStatus, PaymentMethod, TransactionType, PaginatedResponse } from '../types';
import { AppError } from '../utils/errors';
import { CreateSaleInput } from '../utils/validation';

export class SaleService {
  async getSales(params: {
    page: number;
    pageSize: number;
    search?: string;
    status?: TransactionStatus;
    operatorId?: string;
    clientId?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<PaginatedResponse<Sale & { clientName?: string; operatorName?: string; itemCount: number }>> {
    const { page, pageSize, search, status, operatorId, clientId, dateFrom, dateTo } = params;
    
    let sales = db.findMany(db.sales, s => {
      if (status && s.status !== status) return false;
      if (operatorId && s.operatorId !== operatorId) return false;
      if (clientId && s.clientId !== clientId) return false;
      if (dateFrom && s.createdAt < dateFrom) return false;
      if (dateTo && s.createdAt > dateTo) return false;
      if (search) {
        const sTerm = search.toLowerCase();
        if (!s.folio.toLowerCase().includes(sTerm)) return false;
      }
      return true;
    });

    sales.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const enriched = sales.map(s => {
      const client = s.clientId ? db.clients.get(s.clientId) : null;
      const operator = db.users.get(s.operatorId);
      const items = db.findMany(db.saleItems, i => i.saleId === s.id);
      return { 
        ...s, 
        clientName: client?.fullName, 
        operatorName: operator?.fullName,
        itemCount: items.length
      };
    });

    const total = enriched.length;
    const totalPages = Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;
    const data = enriched.slice(start, start + pageSize);

    return { data, total, page, pageSize, totalPages };
  }

  async getSaleById(id: string) {
    const sale = db.findById(db.sales, id);
    if (!sale) throw AppError.notFound('SALE_NOT_FOUND', 'Venta no encontrada');

    const items = db.findMany(db.saleItems, i => i.saleId === id)
      .map(item => {
        const product = db.products.get(item.productId);
        return { ...item, productName: product?.name, productSku: product?.sku };
      });

    const client = sale.clientId ? db.clients.get(sale.clientId) : null;
    const operator = db.users.get(sale.operatorId);
    const payments = db.findMany(db.payments, p => p.saleId === id);

    return { ...sale, items, client, operator, payments };
  }

  async createSale(input: CreateSaleInput, operatorId: string): Promise<{ sale: Sale; warnings: string[] }> {
    const warnings: string[] = [];

    // Validate operator
    const operator = db.findById(db.users, operatorId);
    if (!operator || !operator.isActive) {
      throw AppError.forbidden('OPERATOR_INACTIVE', 'Operador no válido o inactivo');
    }

    // Validate client if provided
    if (input.clientId) {
      const client = db.findById(db.clients, input.clientId);
      if (!client || !client.isActive) {
        throw AppError.badRequest('CLIENT_INACTIVE', 'Cliente no válido o inactivo');
      }
    }

    // Validate products and stock
    const productIds = input.items.map(i => i.productId);
    const products = productIds.map(id => db.products.get(id)).filter(Boolean) as Product[];
    
    if (products.length !== productIds.length) {
      throw AppError.notFound('PRODUCT_NOT_FOUND', 'Uno o más productos no encontrados');
    }

    const productMap = new Map(products.map(p => [p.id, p]));

    // Check stock and prepare items
    let subtotal = 0;
    let taxAmount = 0;
    const saleItemsData: Omit<SaleItem, 'id' | 'saleId'>[] = [];
    const inventoryUpdates: { productId: string; quantity: number }[] = [];

    for (const item of input.items) {
      const product = productMap.get(item.productId)!;
      const inv = db.inventory.get(product.id);
      
      if (!inv) throw AppError.internal('INVENTORY_MISSING', `Inventario no encontrado para ${product.name}`);

      const available = inv.quantity - inv.reservedQty;
      if (item.quantity > available) {
        throw AppError.conflict('INSUFFICIENT_STOCK', 
          `Stock insuficiente para ${product.name} (SKU: ${product.sku}). Disponible: ${available}, Solicitado: ${item.quantity}`);
      }

      const unitPrice = item.unitPrice ?? product.salePrice;
      const discountPct = item.discountPct ?? 0;
      const lineSubtotal = unitPrice * item.quantity;
      const lineDiscount = lineSubtotal * (discountPct / 100);
      const lineNet = lineSubtotal - lineDiscount;
      const lineTax = lineNet * product.taxRate;
      const lineTotal = lineNet + lineTax;

      subtotal += lineNet;
      taxAmount += lineTax;

      saleItemsData.push({
        productId: product.id,
        quantity: item.quantity,
        unitPrice,
        discountPct,
        taxRate: product.taxRate,
        lineTotal,
        costAtSale: product.costPrice
      });

      inventoryUpdates.push({ productId: product.id, quantity: item.quantity });

      // Check low stock warning
      const newQty = available - item.quantity;
      if (newQty <= product.minStock) {
        warnings.push(`⚠️ Stock crítico: ${product.name} queda en ${newQty} (mín: ${product.minStock})`);
      }
    }

    const total = subtotal + taxAmount;
    const paidTotal = input.payments.reduce((sum, p) => sum + p.amount, 0);
    const change = Math.max(0, paidTotal - total);

    if (input.paymentMethod !== PaymentMethod.CREDIT && paidTotal + 0.01 < total) {
      throw AppError.badRequest('INSUFFICIENT_PAYMENT', `Pago insuficiente. Total: $${total.toFixed(2)}, Pagado: $${paidTotal.toFixed(2)}`);
    }

    // Generate folio
    const folio = db.getNextSaleFolio();

    // Create sale (simulated transaction)
    const sale: Sale = {
      id: db.generateId('sale_'),
      folio,
      clientId: input.clientId,
      operatorId,
      subtotal,
      taxAmount,
      discountAmount: 0, // Discounts applied per line
      total,
      paidAmount: paidTotal,
      changeAmount: change,
      status: TransactionStatus.CONFIRMED,
      paymentMethod: input.paymentMethod,
      notes: input.notes,
      source: input.source,
      voiceCommandId: input.voiceCommandId,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    db.sales.set(sale.id, sale);

    // Create sale items
    for (const itemData of saleItemsData) {
      const item: SaleItem = {
        id: db.generateId('si_'),
        saleId: sale.id,
        ...itemData
      };
      db.saleItems.set(item.id, item);
    }

    // Update inventory (atomic)
    for (const upd of inventoryUpdates) {
      const inv = db.inventory.get(upd.productId)!;
      db.update(db.inventory, upd.productId, { 
        quantity: inv.quantity - upd.quantity,
        updatedAt: new Date()
      });
    }

    // Create inventory adjustments for kardex
    for (const itemData of saleItemsData) {
      const adjustment: InventoryAdjustment = {
        id: db.generateId('adj_'),
        folio: db.generateFolio('AJU'),
        productId: itemData.productId,
        operatorId,
        type: TransactionType.SALE,
        quantity: -itemData.quantity,
        reason: `Venta ${folio}`,
        reference: sale.id,
        createdAt: new Date()
      };
      db.adjustments.set(adjustment.id, adjustment);
    }

    // Create payments
    for (const payment of input.payments) {
      const p: Payment = {
        id: db.generateId('pay_'),
        saleId: sale.id,
        amount: payment.amount,
        method: payment.method,
        reference: payment.reference,
        receivedAt: new Date(),
        receivedBy: operatorId
      };
      db.payments.set(p.id, p);
    }

    // Update client balance if credit sale
    if (input.clientId && input.paymentMethod === PaymentMethod.CREDIT) {
      const client = db.clients.get(input.clientId)!;
      db.update(db.clients, input.clientId, { 
        currentBalance: client.currentBalance + total 
      });
    }

    // Log activity
    await this.logActivity(operatorId, 'SALE_CREATE', 'SALE', sale.id, {
      folio, total, itemCount: saleItemsData.length, source: input.source
    });

    return { sale, warnings };
  }

  async cancelSale(id: string, operatorId: string, reason: string) {
    const sale = db.findById(db.sales, id);
    if (!sale) throw AppError.notFound('SALE_NOT_FOUND', 'Venta no encontrada');
    if (sale.status === TransactionStatus.CANCELLED) throw AppError.badRequest('ALREADY_CANCELLED', 'Venta ya cancelada');
    if (sale.status === TransactionStatus.REFUNDED) throw AppError.badRequest('ALREADY_REFUNDED', 'Venta ya reembolsada');

    // Restore inventory
    const items = db.findMany(db.saleItems, i => i.saleId === id);
    for (const item of items) {
      const inv = db.inventory.get(item.productId);
      if (inv) {
        db.update(db.inventory, item.productId, { 
          quantity: inv.quantity + item.quantity,
          updatedAt: new Date()
        });
      }

      // Create reversal adjustment
      const adjustment: InventoryAdjustment = {
        id: db.generateId('adj_'),
        folio: db.generateFolio('AJU'),
        productId: item.productId,
        operatorId,
        type: TransactionType.ADJUSTMENT_IN,
        quantity: item.quantity,
        reason: `Cancelación venta ${sale.folio}: ${reason}`,
        reference: sale.id,
        createdAt: new Date()
      };
      db.adjustments.set(adjustment.id, adjustment);
    }

    // Update sale status
    db.update(db.sales, id, { 
      status: TransactionStatus.CANCELLED,
      cancelledAt: new Date(),
      cancelledBy: operatorId,
      cancelledReason: reason
    });

    // Update client balance if credit
    if (sale.clientId && sale.paymentMethod === PaymentMethod.CREDIT) {
      const client = db.clients.get(sale.clientId)!;
      db.update(db.clients, sale.clientId, { 
        currentBalance: client.currentBalance - sale.total 
      });
    }

    await this.logActivity(operatorId, 'SALE_CANCEL', 'SALE', id, { folio: sale.folio, reason });

    return { success: true };
  }

  async getTodaysStats(operatorId?: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const sales = db.findMany(db.sales, s => 
      s.createdAt >= today && s.createdAt < tomorrow && s.status === TransactionStatus.CONFIRMED &&
      (!operatorId || s.operatorId === operatorId)
    );

    const totalSales = sales.reduce((sum, s) => sum + s.total, 0);
    const totalItems = sales.reduce((sum, s) => {
      const items = db.findMany(db.saleItems, i => i.saleId === s.id);
      return sum + items.length;
    }, 0);

    return {
      salesCount: sales.length,
      totalAmount: totalSales,
      itemsSold: totalItems,
      averageTicket: sales.length > 0 ? totalSales / sales.length : 0
    };
  }

  private async logActivity(userId: string, action: string, entityType: string, entityId: string, metadata: any) {
    const log = {
      id: db.generateId('log_'),
      userId,
      action,
      entityType,
      entityId,
      metadata,
      createdAt: new Date()
    };
    db.activityLogs.set(log.id, log);
  }
}