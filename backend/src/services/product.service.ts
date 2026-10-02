import { db } from '../memory';
import { Product, Category, Inventory, PaginatedResponse } from '../types';
import { AppError } from '../utils/errors';
import { CreateProductInput } from '../utils/validation';

export class ProductService {
  // Categories
  async getCategories() {
    return db.findMany(db.categories, c => true);
  }

  async createCategory(data: { name: string; description?: string; parentId?: string }) {
    const exists = db.findMany(db.categories, c => c.name.toLowerCase() === data.name.toLowerCase())[0];
    if (exists) throw AppError.conflict('CATEGORY_EXISTS', 'La categoría ya existe');

    const now = new Date();
    const category: Category = {
      id: db.generateId('cat_'),
      name: data.name,
      description: data.description,
      parentId: data.parentId,
      createdAt: now
    };
    db.categories.set(category.id, category);
    return category;
  }

  // Products
  async getProducts(params: {
    page: number;
    pageSize: number;
    search?: string;
    categoryId?: string;
    isActive?: boolean;
    lowStock?: boolean;
  }): Promise<PaginatedResponse<Product & { inventory?: Inventory; categoryName?: string }>> {
    const { page, pageSize, search, categoryId, isActive, lowStock } = params;
    
    let products = db.findMany(db.products, p => {
      if (isActive !== undefined && p.isActive !== isActive) return false;
      if (categoryId && p.categoryId !== categoryId) return false;
      if (search) {
        const s = search.toLowerCase();
        if (!p.name.toLowerCase().includes(s) && 
            !p.sku.toLowerCase().includes(s) && 
            !(p.barcode?.includes(s))) return false;
      }
      return true;
    });

    // Add inventory and category info
    const enriched = products.map(p => {
      const inv = db.inventory.get(p.id);
      const cat = db.categories.get(p.categoryId);
      return { ...p, inventory: inv, categoryName: cat?.name };
    });

    // Filter low stock
    if (lowStock) {
      enriched.filter(p => p.inventory && p.inventory.quantity <= p.minStock);
    }

    // Sort by name
    enriched.sort((a, b) => a.name.localeCompare(b.name));

    const total = enriched.length;
    const totalPages = Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;
    const data = enriched.slice(start, start + pageSize);

    return { data, total, page, pageSize, totalPages };
  }

  async getProductById(id: string) {
    const product = db.findById(db.products, id);
    if (!product) throw AppError.notFound('PRODUCT_NOT_FOUND', 'Producto no encontrado');
    
    const inv = db.inventory.get(id);
    const cat = db.categories.get(product.categoryId);
    return { ...product, inventory: inv, categoryName: cat?.name };
  }

  async getProductBySkuOrBarcode(code: string) {
    let product = db.findProductBySku(code);
    if (!product) product = db.findProductByBarcode(code);
    if (!product) throw AppError.notFound('PRODUCT_NOT_FOUND', 'Producto no encontrado');
    
    const inv = db.inventory.get(product.id);
    return { ...product, inventory: inv };
  }

  async createProduct(data: CreateProductInput) {
    const exists = db.findProductBySku(data.sku);
    if (exists) throw AppError.conflict('SKU_EXISTS', 'El SKU ya existe');

    if (data.barcode) {
      const existsBarcode = db.findProductByBarcode(data.barcode);
      if (existsBarcode) throw AppError.conflict('BARCODE_EXISTS', 'El código de barras ya existe');
    }

    const category = db.findById(db.categories, data.categoryId);
    if (!category) throw AppError.notFound('CATEGORY_NOT_FOUND', 'Categoría no encontrada');

    const now = new Date();
    const product: Product = {
      id: db.generateId('prod_'),
      ...data,
      isActive: true,
      createdAt: now,
      updatedAt: now
    };

    db.products.set(product.id, product);

    // Create inventory record
    const inv: Inventory = {
      id: db.generateId('inv_'),
      productId: product.id,
      quantity: 0,
      reservedQty: 0,
      updatedAt: now
    };
    db.inventory.set(product.id, inv);

    return product;
  }

  async updateProduct(id: string, data: Partial<Product>) {
    const product = db.findById(db.products, id);
    if (!product) throw AppError.notFound('PRODUCT_NOT_FOUND', 'Producto no encontrado');

    if (data.sku && data.sku !== product.sku) {
      const exists = db.findProductBySku(data.sku);
      if (exists) throw AppError.conflict('SKU_EXISTS', 'El SKU ya existe');
    }

    if (data.barcode && data.barcode !== product.barcode) {
      const exists = db.findProductByBarcode(data.barcode);
      if (exists) throw AppError.conflict('BARCODE_EXISTS', 'El código de barras ya existe');
    }

    const updated = db.update(db.products, id, data);
    return updated!;
  }

  async deleteProduct(id: string) {
    const product = db.findById(db.products, id);
    if (!product) throw AppError.notFound('PRODUCT_NOT_FOUND', 'Producto no encontrado');

    // Soft delete
    db.update(db.products, id, { isActive: false });
    return { success: true };
  }

  async adjustStock(productId: string, quantity: number, reason: string, operatorId: string, reference?: string) {
    const product = db.findById(db.products, id);
    if (!product) throw AppError.notFound('PRODUCT_NOT_FOUND', 'Producto no encontrado');

    const inv = db.inventory.get(productId);
    if (!inv) throw AppError.notFound('INVENTORY_NOT_FOUND', 'Inventario no encontrado');

    const newQty = inv.quantity + quantity;
    if (newQty < 0) throw AppError.badRequest('NEGATIVE_STOCK', 'El stock no puede ser negativo');

    // Update inventory
    db.update(db.inventory, productId, { quantity: newQty, updatedAt: new Date() });

    // Create adjustment record
    const { TransactionType } = await import('../types');
    const adjustment = {
      id: db.generateId('adj_'),
      folio: db.generateFolio('AJU'),
      productId,
      operatorId,
      type: quantity > 0 ? TransactionType.ADJUSTMENT_IN : TransactionType.ADJUSTMENT_OUT,
      quantity,
      reason,
      reference,
      createdAt: new Date()
    };
    db.adjustments.set(adjustment.id, adjustment);

    return { product: { ...product, inventory: { ...inv, quantity: newQty } }, adjustment };
  }

  async getLowStock(threshold = 0.2) {
    const products = db.findMany(db.products, p => p.isActive && p.trackStock);
    return products
      .map(p => {
        const inv = db.inventory.get(p.id);
        if (!inv) return null;
        const pct = p.minStock > 0 ? inv.quantity / p.minStock : 1;
        return pct <= threshold ? { product: p, inventory: inv, percentage: pct } : null;
      })
      .filter(Boolean)
      .sort((a, b) => a!.percentage - b!.percentage);
  }
}