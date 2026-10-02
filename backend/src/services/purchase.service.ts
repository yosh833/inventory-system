import { db } from '../memory';
import { Purchase, PurchaseItem, Supplier, Product, Inventory, User, InventoryAdjustment, TransactionStatus, TransactionType, PaginatedResponse } from '../types';
import { AppError } from '../utils/errors';
import { CreatePurchaseInput } from '../utils/validation';

export class PurchaseService {
  async getPurchases(params: {
    page: number;
    pageSize: number;
    search?: string;
    status?: TransactionStatus;
    supplierId?: string;
    operatorId?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<PaginatedResponse<Purchase & { supplierName?: string; operatorName?: string; itemCount: number }>> {
    const { page, pageSize, search, status, supplierId, operatorId, dateFrom, dateTo } = params;
    
    let purchases = db.findMany(db.purchases, p => {
      if (status && p.status !== status) return false;
      if (supplierId && p.supplierId !== supplierId) return false;
      if (operatorId && p.operatorId !== operatorId) return false;
      if (dateFrom && p.createdAt < dateFrom) return false;
      if (dateTo && p.createdAt > dateTo) return false;
      if (search) {
        const s = search.toLowerCase();
        if (!p.folio.toLowerCase().includes(s)) return false;
      }
      return true;
    });

    purchases.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const enriched = purchases.map(p => {
      const supplier = db.suppliers.get(p.supplierId);
      const operator = db.users.get(p.operatorId);
      const items = db.findMany(db.purchaseItems, i => i.purchaseId === p.id);
      return { 
        ...p, 
        supplierName: supplier?.name, 
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

  async getPurchaseById(id: string) {
    const purchase = db.findById(db.purchases, id);
    if (!purchase) throw AppError.notFound('PURCHASE_NOT_FOUND', 'Compra no encontrada');

    const items = db.findMany(db.purchaseItems, i => i.purchaseId === id)
      .map(item => {
        const product = db.products.get(item.productId);
        return { ...item, productName: product?.name, productSku: product?.sku };
      });

    const supplier = db.suppliers.get(purchase.supplierId);
    const operator = db.users.get(purchase.operatorId);

    return { ...purchase, items, supplier, operator };
  }

  async createPurchase(input: CreatePurchaseInput, operatorId: string): Promise<Purchase> {
    const operator = db.findById(db.users, operatorId);
    if (!operator || !operator.isActive) {
      throw AppError.forbidden('OPERATOR_INACTIVE', 'Operador no válido o inactivo');
    }

    const supplier = db.findById(db.suppliers, input.supplierId);
    if (!supplier || !supplier.isActive) {
      throw AppError.badRequest('SUPPLIER_INACTIVE', 'Proveedor no válido o inactivo');
    }

    let subtotal = 0;
    let taxAmount = 0;
    const purchaseItemsData: Omit<PurchaseItem, 'id' | 'purchaseId'>[] = [];

    for (const item of input.items) {
      const product = db.products.get(item.productId);
      if (!product) throw AppError.notFound('PRODUCT_NOT_FOUND', `Producto no encontrado: ${item.productId}`);

      const lineSubtotal = item.unitCost * item.quantityOrdered;
      const lineTax = lineSubtotal * item.taxRate;
      const lineTotal = lineSubtotal + lineTax;

      subtotal += lineSubtotal;
      taxAmount += lineTax;

      purchaseItemsData.push({
        productId: product.id,
        quantityOrdered: item.quantityOrdered,
        quantityReceived: 0,
        unitCost: item.unitCost,
        taxRate: item.taxRate,
        lineTotal
      });
    }

    const total = subtotal + taxAmount;
    const folio = db.getNextPurchaseFolio();

    const purchase: Purchase = {
      id: db.generateId('pur_'),
      folio,
      supplierId: input.supplierId,
      operatorId,
      subtotal,
      taxAmount,
      discountAmount: 0,
      total,
      paidAmount: 0,
      status: TransactionStatus.PENDING,
      expectedDate: input.expectedDate ? new Date(input.expectedDate) : undefined,
      notes: input.notes,
      source: input.source,
      voiceCommandId: input.voiceCommandId,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    db.purchases.set(purchase.id, purchase);

    for (const itemData of purchaseItemsData) {
      const item: PurchaseItem = {
        id: db.generateId('pi_'),
        purchaseId: purchase.id,
        ...itemData
      };
      db.purchaseItems.set(item.id, item);
    }

    await this.logActivity(operatorId, 'PURCHASE_CREATE', 'PURCHASE', purchase.id, {
      folio, total, itemCount: purchaseItemsData.length, supplier: supplier.name
    });

    return purchase;
  }

  async receivePurchase(id: string, operatorId: string, items: { itemId: string; quantityReceived: number }[]) {
    const purchase = db.findById(db.purchases, id);
    if (!purchase) throw AppError.notFound('PURCHASE_NOT_FOUND', 'Compra no encontrada');
    if (purchase.status === TransactionStatus.CANCELLED) throw AppError.badRequest('CANCELLED', 'Compra cancelada');

    let allReceived = true;
    let anyReceived = false;

    for (const { itemId, quantityReceived } of items) {
      const item = db.findById(db.purchaseItems, itemId);
      if (!item || item.purchaseId !== id) continue;

      const newReceived = Math.min(quantityReceived, item.quantityOrdered - item.quantityReceived);
      if (newReceived <= 0) continue;

      anyReceived = true;
      const updatedReceived = item.quantityReceived + newReceived;
      
      db.update(db.purchaseItems, itemId, { quantityReceived: updatedReceived });

      // Update product cost price (weighted average)
      const product = db.products.get(item.productId);
      const inv = db.inventory.get(item.productId);
      
      if (product && inv) {
        const currentValue = product.costPrice * inv.quantity;
        const newValue = item.unitCost * newReceived;
        const newTotalQty = inv.quantity + newReceived;
        const newAvgCost = newTotalQty > 0 ? (currentValue + newValue) / newTotalQty : item.unitCost;
        
        db.update(db.products, item.productId, { costPrice: newAvgCost });
        db.update(db.inventory, item.productId, { 
          quantity: newTotalQty,
          updatedAt: new Date()
        });

        // Create inventory adjustment
        const adjustment: InventoryAdjustment = {
          id: db.generateId('adj_'),
          folio: db.generateFolio('AJU'),
          productId: item.productId,
          operatorId,
          type: TransactionType.PURCHASE,
          quantity: newReceived,
          reason: `Recepción compra ${purchase.folio}`,
          reference: purchase.id,
          createdAt: new Date()
        };
        db.adjustments.set(adjustment.id, adjustment);
      }

      if (updatedReceived < item.quantityOrdered) {
        allReceived = false;
      }
    }

    if (!anyReceived) throw AppError.badRequest('NOTHING_RECEIVED', 'No se recibieron items');

    const newStatus = allReceived ? TransactionStatus.CONFIRMED : TransactionStatus.PENDING;
    db.update(db.purchases, id, { 
      status: newStatus,
      receivedDate: allReceived ? new Date() : undefined,
      updatedAt: new Date()
    });

    await this.logActivity(operatorId, 'PURCHASE_RECEIVE', 'PURCHASE', id, { 
      folio: purchase.folio, itemsReceived: items.length 
    });

    return { success: true, status: newStatus };
  }

  async getSuppliers() {
    return db.findMany(db.suppliers, s => s.isActive);
  }

  async createSupplier(data: { name: string; contactName?: string; email?: string; phone?: string; address?: string; taxId?: string; paymentTerms?: number }) {
    const code = db.getNextSupplierCode();
    const now = new Date();
    const supplier = {
      id: db.generateId('sup_'),
      code,
      ...data,
      paymentTerms: data.paymentTerms ?? 30,
      isActive: true,
      createdAt: now,
      updatedAt: now
    };
    db.suppliers.set(supplier.id, supplier);
    return supplier;
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