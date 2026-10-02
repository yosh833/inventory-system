import { v4 as uuidv4 } from 'uuid';
import {
  User, Client, Category, Product, Inventory, Sale, SaleItem,
  Purchase, PurchaseItem, Supplier, InventoryAdjustment,
  Payment, ActivityLog, SystemConfig, Role, TransactionStatus,
  PaymentMethod, TransactionType
} from '../types';

type EntityMap<T> = Map<string, T>;

class InMemoryDB {
  users: EntityMap<User> = new Map();
  clients: EntityMap<Client> = new Map();
  categories: EntityMap<Category> = new Map();
  products: EntityMap<Product> = new Map();
  inventory: EntityMap<Inventory> = new Map();
  sales: EntityMap<Sale> = new Map();
  saleItems: EntityMap<SaleItem> = new Map();
  purchases: EntityMap<Purchase> = new Map();
  purchaseItems: EntityMap<PurchaseItem> = new Map();
  suppliers: EntityMap<Supplier> = new Map();
  adjustments: EntityMap<InventoryAdjustment> = new Map();
  payments: EntityMap<Payment> = new Map();
  activityLogs: EntityMap<ActivityLog> = new Map();
  systemConfigs: EntityMap<SystemConfig> = new Map();

  private counters = {
    user: 0, client: 0, product: 0, sale: 0, purchase: 0,
    supplier: 0, adjustment: 0, category: 0
  };

  generateId(prefix: string = ''): string {
    return `${prefix}${uuidv4()}`;
  }

  generateFolio(prefix: string): string {
    const year = new Date().getFullYear();
    const counter = ++this.counters[prefix.toLowerCase() as keyof typeof this.counters] || 1;
    return `${prefix}-${year}-${counter.toString().padStart(4, '0')}`;
  }

  // Generic CRUD
  create<T extends { id: string }>(map: EntityMap<T>, entity: T): T {
    map.set(entity.id, entity);
    return entity;
  }

  findById<T>(map: EntityMap<T>, id: string): T | undefined {
    return map.get(id);
  }

  findMany<T>(map: EntityMap<T>, filter?: (entity: T) => boolean): T[] {
    const entities = Array.from(map.values());
    return filter ? entities.filter(filter) : entities;
  }

  update<T extends { id: string; updatedAt: Date }>(map: EntityMap<T>, id: string, data: Partial<T>): T | undefined {
    const entity = map.get(id);
    if (!entity) return undefined;
    const updated = { ...entity, ...data, updatedAt: new Date() } as T;
    map.set(id, updated);
    return updated;
  }

  delete<T>(map: EntityMap<T>, id: string): boolean {
    return map.delete(id);
  }

  // Specific finders
  findUserByEmail(email: string): User | undefined {
    return this.findMany(this.users, u => u.email.toLowerCase() === email.toLowerCase())[0];
  }

  findProductBySku(sku: string): Product | undefined {
    return this.findMany(this.products, p => p.sku.toLowerCase() === sku.toLowerCase())[0];
  }

  findProductByBarcode(barcode: string): Product | undefined {
    return this.findMany(this.products, p => p.barcode === barcode)[0];
  }

  findClientByCode(code: string): Client | undefined {
    return this.findMany(this.clients, c => c.code === code)[0];
  }

  getInventory(productId: string): Inventory | undefined {
    return this.inventory.get(productId);
  }

  getNextSaleFolio(): string {
    return this.generateFolio('VTA');
  }

  getNextPurchaseFolio(): string {
    return this.generateFolio('CMP');
  }

  getNextAdjustmentFolio(): string {
    return this.generateFolio('AJU');
  }

  getNextClientCode(): string {
    const count = this.clients.size + 1;
    return `CLI-${count.toString().padStart(3, '0')}`;
  }

  getNextSupplierCode(): string {
    const count = this.suppliers.size + 1;
    return `PROV-${count.toString().padStart(3, '0')}`;
  }

  // Transaction support (simulated)
  async transaction<T>(fn: () => Promise<T>): Promise<T> {
    return await fn();
  }
}

export const db = new InMemoryDB();

// Seed initial data
export async function seedDatabase() {
  const bcrypt = await import('bcryptjs');
  const bcryptDefault = bcrypt.default || bcrypt;
  const now = new Date();

  // Admin user
  const adminId = db.generateId('usr_');
  const admin: User = {
    id: adminId,
    email: 'admin@demo.com',
    passwordHash: await bcryptDefault.hash('admin123', 10),
    fullName: 'Administrador',
    role: Role.ADMIN,
    isActive: true,
    createdAt: now,
    updatedAt: now
  };
  db.users.set(adminId, admin);

  // Operator user
  const operatorId = db.generateId('usr_');
  const operator: User = {
    id: operatorId,
    email: 'operador@demo.com',
    passwordHash: await bcryptDefault.hash('operator123', 10),
    fullName: 'Juan Operador',
    role: Role.OPERATOR,
    isActive: true,
    createdAt: now,
    updatedAt: now
  };
  db.users.set(operatorId, operator);

  // Categories
  const cat1Id = db.generateId('cat_');
  const cat1: Category = { id: cat1Id, name: 'Ferretería', description: 'Herramientas y materiales', createdAt: now };
  db.categories.set(cat1Id, cat1);

  const cat2Id = db.generateId('cat_');
  const cat2: Category = { id: cat2Id, name: 'Pinturas', description: 'Pinturas y accesorios', createdAt: now };
  db.categories.set(cat2Id, cat2);

  const cat3Id = db.generateId('cat_');
  const cat3: Category = { id: cat3Id, name: 'Eléctrico', description: 'Material eléctrico', createdAt: now };
  db.categories.set(cat3Id, cat3);

  // Products
  const products: Product[] = [
    {
      id: db.generateId('prod_'), sku: 'TOR-M8-50', barcode: '7501234567890',
      name: 'Tornillo M8 x 50mm', description: 'Tornillo hexágono acero inoxidable',
      categoryId: cat1Id, costPrice: 2.50, salePrice: 5.00, wholesalePrice: 4.00,
      taxRate: 0.16, trackStock: true, minStock: 10, maxStock: 1000, unit: 'PZA',
      allowDecimal: false, hasVariants: false, isActive: true, createdAt: now, updatedAt: now
    },
    {
      id: db.generateId('prod_'), sku: 'MART-500', barcode: '7501234567891',
      name: 'Martillo 500g', description: 'Martillo de uña fibra de vidrio',
      categoryId: cat1Id, costPrice: 85.00, salePrice: 150.00, wholesalePrice: 130.00,
      taxRate: 0.16, trackStock: true, minStock: 5, maxStock: 100, unit: 'PZA',
      allowDecimal: false, hasVariants: false, isActive: true, createdAt: now, updatedAt: now
    },
    {
      id: db.generateId('prod_'), sku: 'PINT-BLA-19', barcode: '7501234567892',
      name: 'Pintura Blanca 19L', description: 'Pintura vinílica interior/exterior',
      categoryId: cat2Id, costPrice: 280.00, salePrice: 450.00, wholesalePrice: 400.00,
      taxRate: 0.16, trackStock: true, minStock: 3, maxStock: 50, unit: 'CUB',
      allowDecimal: false, hasVariants: false, isActive: true, createdAt: now, updatedAt: now
    },
    {
      id: db.generateId('prod_'), sku: 'CAB-12-100', barcode: '7501234567893',
      name: 'Cable Calibre 12 (100m)', description: 'Cable THHW/THWN-2 calibre 12',
      categoryId: cat3Id, costPrice: 450.00, salePrice: 720.00, wholesalePrice: 650.00,
      taxRate: 0.16, trackStock: true, minStock: 2, maxStock: 30, unit: 'ROL',
      allowDecimal: false, hasVariants: false, isActive: true, createdAt: now, updatedAt: now
    },
    {
      id: db.generateId('prod_'), sku: 'VAR-38-6', barcode: '7501234567894',
      name: 'Varilla 3/8" x 6m', description: 'Varilla corrugada grado 42',
      categoryId: cat1Id, costPrice: 42.00, salePrice: 68.00, wholesalePrice: 60.00,
      taxRate: 0.16, trackStock: true, minStock: 20, maxStock: 500, unit: 'PZA',
      allowDecimal: false, hasVariants: false, isActive: true, createdAt: now, updatedAt: now
    }
  ];

  products.forEach(p => {
    db.products.set(p.id, p);
    // Create inventory record
    const initialQty = Math.floor(Math.random() * 50) + 20;
    const inv: Inventory = {
      id: db.generateId('inv_'), productId: p.id, quantity: initialQty,
      reservedQty: 0, updatedAt: now
    };
    db.inventory.set(p.id, inv);
  });

  // Clients
  const clients: Client[] = [
    { id: db.generateId('cli_'), code: 'CLI-001', fullName: 'Juan Pérez', email: 'juan@email.com', phone: '555-1234', address: 'Calle 1 #123', taxId: 'PEPJ800101', creditLimit: 5000, currentBalance: 0, isActive: true, notes: 'Cliente frecuente', createdAt: now, updatedAt: now },
    { id: db.generateId('cli_'), code: 'CLI-002', fullName: 'María González', email: 'maria@email.com', phone: '555-5678', address: 'Av. Principal 456', taxId: 'GOMM850202', creditLimit: 10000, currentBalance: 1200, isActive: true, notes: '', createdAt: now, updatedAt: now },
    { id: db.generateId('cli_'), code: 'CLI-003', fullName: 'Constructora ABC', email: 'compras@abc.com', phone: '555-9012', address: 'Zona Industrial', taxId: 'ABC123456', creditLimit: 50000, currentBalance: 15000, isActive: true, notes: 'Cuenta mayorista', createdAt: now, updatedAt: now }
  ];
  clients.forEach(c => db.clients.set(c.id, c));

  // Suppliers
  const suppliers: Supplier[] = [
    { id: db.generateId('sup_'), code: 'PROV-001', name: 'Aceros del Norte', contactName: 'Carlos Ruiz', email: 'ventas@acerosnorte.com', phone: '555-1111', address: 'Blvd. Industrial 100', taxId: 'ACN123456', paymentTerms: 30, isActive: true, createdAt: now, updatedAt: now },
    { id: db.generateId('sup_'), code: 'PROV-002', name: 'Eléctrica Central', contactName: 'Ana Torres', email: 'ana@electricacentral.com', phone: '555-2222', address: 'Calle Comercio 200', taxId: 'ELC789012', paymentTerms: 15, isActive: true, createdAt: now, updatedAt: now },
    { id: db.generateId('sup_'), code: 'PROV-003', name: 'Pinturas México', contactName: 'Luis Méndez', email: 'luis@pinturasmex.com', phone: '555-3333', address: 'Av. Fábricas 300', taxId: 'PTM345678', paymentTerms: 45, isActive: true, createdAt: now, updatedAt: now }
  ];
  suppliers.forEach(s => db.suppliers.set(s.id, s));

  // System configs
  const configs: SystemConfig[] = [
    { key: 'company_name', value: 'Ferretería El Tornillo', description: 'Nombre de la empresa', updatedAt: now },
    { key: 'tax_rate_default', value: 0.16, description: 'IVA por defecto', updatedAt: now },
    { key: 'currency', value: 'MXN', description: 'Moneda', updatedAt: now },
    { key: 'voice_enabled', value: true, description: 'Habilitar comandos de voz', updatedAt: now }
  ];
  configs.forEach(c => db.systemConfigs.set(c.key, c));

  console.log('✅ Database seeded with demo data');
  console.log(`   Users: ${db.users.size}, Products: ${db.products.size}, Clients: ${db.clients.size}, Suppliers: ${db.suppliers.size}`);
}