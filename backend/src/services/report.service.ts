import { db } from '../memory';
import { Sale, Purchase, Product, Inventory, InventoryAdjustment, Client, User, TransactionStatus, PaymentMethod, TransactionType } from '../types';

export class ReportService {
  async getSalesReport(params: { from: Date; to: Date; operatorId?: string; clientId?: string; paymentMethod?: PaymentMethod }) {
    const sales = db.findMany(db.sales, s => 
      s.createdAt >= params.from && s.createdAt <= params.to &&
      s.status === TransactionStatus.CONFIRMED &&
      (!params.operatorId || s.operatorId === params.operatorId) &&
      (!params.clientId || s.clientId === params.clientId) &&
      (!params.paymentMethod || s.paymentMethod === params.paymentMethod)
    );

    const byDay: Record<string, { count: number; total: number }> = {};
    const byOperator: Record<string, { count: number; total: number; name: string }> = {};
    const byPaymentMethod: Record<string, { count: number; total: number }> = {};
    const byClient: Record<string, { count: number; total: number; name: string }> = {};

    for (const sale of sales) {
      const day = sale.createdAt.toISOString().split('T')[0];
      byDay[day] = byDay[day] || { count: 0, total: 0 };
      byDay[day].count++;
      byDay[day].total += sale.total;

      const op = db.users.get(sale.operatorId);
      byOperator[sale.operatorId] = byOperator[sale.operatorId] || { count: 0, total: 0, name: op?.fullName || 'Desconocido' };
      byOperator[sale.operatorId].count++;
      byOperator[sale.operatorId].total += sale.total;

      byPaymentMethod[sale.paymentMethod] = byPaymentMethod[sale.paymentMethod] || { count: 0, total: 0 };
      byPaymentMethod[sale.paymentMethod].count++;
      byPaymentMethod[sale.paymentMethod].total += sale.total;

      if (sale.clientId) {
        const client = db.clients.get(sale.clientId);
        byClient[sale.clientId] = byClient[sale.clientId] || { count: 0, total: 0, name: client?.fullName || 'Desconocido' };
        byClient[sale.clientId].count++;
        byClient[sale.clientId].total += sale.total;
      }
    }

    const totalSales = sales.length;
    const totalAmount = sales.reduce((sum, s) => sum + s.total, 0);
    const totalTax = sales.reduce((sum, s) => sum + s.taxAmount, 0);
    const avgTicket = totalSales > 0 ? totalAmount / totalSales : 0;

    return {
      summary: { totalSales, totalAmount, totalTax, avgTicket },
      byDay: Object.entries(byDay).map(([date, data]) => ({ date, ...data })),
      byOperator: Object.entries(byOperator).map(([operatorId, data]) => ({ operatorId, ...data })),
      byPaymentMethod: Object.entries(byPaymentMethod).map(([method, data]) => ({ method, ...data })),
      topClients: Object.entries(byClient)
        .map(([clientId, data]) => ({ clientId, ...data }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10),
      sales
    };
  }

  async getPurchasesReport(params: { from: Date; to: Date; supplierId?: string }) {
    const purchases = db.findMany(db.purchases, p => 
      p.createdAt >= params.from && p.createdAt <= params.to &&
      p.status !== TransactionStatus.CANCELLED &&
      (!params.supplierId || p.supplierId === params.supplierId)
    );

    const byDay: Record<string, { count: number; total: number }> = {};
    const bySupplier: Record<string, { count: number; total: number; name: string }> = {};

    for (const p of purchases) {
      const day = p.createdAt.toISOString().split('T')[0];
      byDay[day] = byDay[day] || { count: 0, total: 0 };
      byDay[day].count++;
      byDay[day].total += p.total;

      const sup = db.suppliers.get(p.supplierId);
      bySupplier[p.supplierId] = bySupplier[p.supplierId] || { count: 0, total: 0, name: sup?.name || 'Desconocido' };
      bySupplier[p.supplierId].count++;
      bySupplier[p.supplierId].total += p.total;
    }

    return {
      summary: { 
        totalPurchases: purchases.length, 
        totalAmount: purchases.reduce((sum, p) => sum + p.total, 0),
        totalTax: purchases.reduce((sum, p) => sum + p.taxAmount, 0)
      },
      byDay: Object.entries(byDay).map(([date, data]) => ({ date, ...data })),
      bySupplier: Object.entries(bySupplier).map(([supplierId, data]) => ({ supplierId, ...data })),
      purchases
    };
  }

  async getTopProductsReport(params: { from: Date; to: Date; limit?: number }) {
    const sales = db.findMany(db.sales, s => 
      s.createdAt >= params.from && s.createdAt <= params.to &&
      s.status === TransactionStatus.CONFIRMED
    );

    const productStats: Record<string, { 
      productId: string; name: string; sku: string; 
      qtySold: number; revenue: number; cost: number; margin: number; count: number 
    }> = {};

    for (const sale of sales) {
      const items = db.findMany(db.saleItems, i => i.saleId === sale.id);
      for (const item of items) {
        const product = db.products.get(item.productId);
        if (!product) continue;

        const key = item.productId;
        const revenue = item.lineTotal;
        const cost = item.costAtSale * item.quantity;
        
        productStats[key] = productStats[key] || { 
          productId: key, 
          name: product.name, 
          sku: product.sku,
          qtySold: 0, 
          revenue: 0, 
          cost: 0, 
          margin: 0, 
          count: 0 
        };
        
        productStats[key].qtySold += item.quantity;
        productStats[key].revenue += revenue;
        productStats[key].cost += cost;
        productStats[key].count++;
      }
    }

    const result = Object.values(productStats)
      .map(p => ({ ...p, margin: p.revenue > 0 ? ((p.revenue - p.cost) / p.revenue) * 100 : 0 }))
      .sort((a, b) => b.qtySold - a.qtySold)
      .slice(0, params.limit || 20);

    return { products: result };
  }

  async getLowStockReport() {
    const products = db.findMany(db.products, p => p.isActive && p.trackStock);
    
    const alerts = products.map(p => {
      const inv = db.inventory.get(p.id);
      if (!inv) return null;
      
      const available = inv.quantity - inv.reservedQty;
      const percentage = p.minStock > 0 ? available / p.minStock : 1;
      const isCritical = available <= p.minStock;
      const isLow = percentage <= 0.5 && !isCritical;
      
      if (!isCritical && !isLow) return null;

      // Calculate days until stockout based on recent sales (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentSales = db.findMany(db.sales, s => 
        s.createdAt >= thirtyDaysAgo && s.status === TransactionStatus.CONFIRMED
      );
      
      let totalSold = 0;
      for (const sale of recentSales) {
        const items = db.findMany(db.saleItems, i => i.saleId === sale.id && i.productId === p.id);
        totalSold += items.reduce((sum, i) => sum + i.quantity, 0);
      }
      
      const dailyAvg = totalSold / 30;
      const daysUntilStockout = dailyAvg > 0 ? Math.floor(available / dailyAvg) : null;

      return {
        productId: p.id,
        productName: p.name,
        sku: p.sku,
        currentStock: available,
        minStock: p.minStock,
        maxStock: p.maxStock,
        percentage: Math.round(percentage * 100),
        status: isCritical ? 'CRITICAL' : 'LOW',
        dailyAverage: Math.round(dailyAvg * 100) / 100,
        daysUntilStockout
      };
    }).filter(Boolean);

    return { alerts: alerts.sort((a, b) => a!.percentage - b!.percentage) };
  }

  async getCashFlowReport(params: { from: Date; to: Date }) {
    const sales = db.findMany(db.sales, s => 
      s.createdAt >= params.from && s.createdAt <= params.to &&
      s.status === TransactionStatus.CONFIRMED
    );

    const purchases = db.findMany(db.purchases, p => 
      p.createdAt >= params.from && p.createdAt <= params.to &&
      p.status !== TransactionStatus.CANCELLED
    );

    const adjustments = db.findMany(db.inventoryAdjustments, a => 
      a.createdAt >= params.from && a.createdAt <= params.to
    );

    // Inflows
    const salesByDay: Record<string, number> = {};
    for (const s of sales) {
      const day = s.createdAt.toISOString().split('T')[0];
      salesByDay[day] = (salesByDay[day] || 0) + s.paidAmount;
    }

    // Outflows (purchases paid)
    const purchasesByDay: Record<string, number> = {};
    for (const p of purchases) {
      if (p.paidAmount > 0) {
        const day = p.createdAt.toISOString().split('T')[0];
        purchasesByDay[day] = (purchasesByDay[day] || 0) + p.paidAmount;
      }
    }

    // Net by day
    const allDays = new Set([...Object.keys(salesByDay), ...Object.keys(purchasesByDay)]);
    const dailyFlow = Array.from(allDays)
      .map(date => ({
        date,
        inflow: salesByDay[date] || 0,
        outflow: purchasesByDay[date] || 0,
        net: (salesByDay[date] || 0) - (purchasesByDay[date] || 0)
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const totalInflow = sales.reduce((sum, s) => sum + s.paidAmount, 0);
    const totalOutflow = purchases.reduce((sum, p) => sum + p.paidAmount, 0);

    return {
      summary: { totalInflow, totalOutflow, net: totalInflow - totalOutflow },
      daily: dailyFlow,
      salesTotal: sales.reduce((sum, s) => sum + s.total, 0),
      purchasesTotal: purchases.reduce((sum, p) => sum + p.total, 0)
    };
  }

  async getKardex(productId: string, params: { from?: Date; to?: Date }) {
    const product = db.products.get(productId);
    if (!product) throw new Error('Producto no encontrado');

    const movements: Array<{
      date: Date;
      type: string;
      folio: string;
      qtyIn: number;
      qtyOut: number;
      balance: number;
      unitCost: number;
      totalValue: number;
      reference: string;
    }> = [];

    let balance = 0;
    let avgCost = product.costPrice;

    // Initial balance from inventory
    const inv = db.inventory.get(productId);
    if (inv) balance = inv.quantity;

    // Get all adjustments
    const adjs = db.findMany(db.inventoryAdjustments, a => 
      a.productId === productId &&
      (!params.from || a.createdAt >= params.from) &&
      (!params.to || a.createdAt <= params.to)
    ).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    for (const adj of adjs) {
      const isIn = adj.quantity > 0;
      const qty = Math.abs(adj.quantity);
      
      if (isIn) {
        // For purchases, get the actual cost from purchase item
        let unitCost = avgCost;
        if (adj.type === TransactionType.PURCHASE && adj.reference) {
          const purchase = db.purchases.get(adj.reference);
          if (purchase) {
            const item = db.findMany(db.purchaseItems, i => 
              i.purchaseId === purchase.id && i.productId === productId
            )[0];
            if (item) unitCost = item.unitCost;
          }
        }
        
        // Update weighted average cost
        const newTotalValue = balance * avgCost + qty * unitCost;
        balance += qty;
        avgCost = balance > 0 ? newTotalValue / balance : unitCost;
      } else {
        balance -= qty;
      }

      movements.push({
        date: adj.createdAt,
        type: adj.type,
        folio: adj.folio,
        qtyIn: isIn ? qty : 0,
        qtyOut: isIn ? 0 : qty,
        balance,
        unitCost: avgCost,
        totalValue: balance * avgCost,
        reference: adj.reason
      });
    }

    return { product, movements, currentBalance: balance, currentAvgCost: avgCost };
  }

  async getDashboardStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todaysSales = db.findMany(db.sales, s => 
      s.createdAt >= today && s.createdAt < tomorrow && s.status === TransactionStatus.CONFIRMED
    );

    const lowStock = await this.getLowStockReport();
    
    const activeProducts = db.findMany(db.products, p => p.isActive).length;
    const activeClients = db.findMany(db.clients, c => c.isActive).length;
    const pendingPurchases = db.findMany(db.purchases, p => p.status === TransactionStatus.PENDING).length;

    return {
      today: {
        salesCount: todaysSales.length,
        totalAmount: todaysSales.reduce((sum, s) => sum + s.total, 0),
        avgTicket: todaysSales.length > 0 ? todaysSales.reduce((sum, s) => sum + s.total, 0) / todaysSales.length : 0
      },
      inventory: {
        activeProducts,
        lowStockCount: lowStock.alerts.filter(a => a.status === 'LOW').length,
        criticalStockCount: lowStock.alerts.filter(a => a.status === 'CRITICAL').length
      },
      clients: { active: activeClients },
      purchases: { pending: pendingPurchases }
    };
  }
}