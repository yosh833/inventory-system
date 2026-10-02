export enum Role {
  ADMIN = 'ADMIN',
  OPERATOR = 'OPERATOR',
  CLIENT = 'CLIENT'
}

export enum TransactionType {
  SALE = 'SALE',
  PURCHASE = 'PURCHASE',
  ADJUSTMENT_IN = 'ADJUSTMENT_IN',
  ADJUSTMENT_OUT = 'ADJUSTMENT_OUT',
  TRANSFER = 'TRANSFER'
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED'
}

export enum PaymentMethod {
  CASH = 'CASH',
  CARD = 'CARD',
  TRANSFER = 'TRANSFER',
  CREDIT = 'CREDIT',
  MIXED = 'MIXED'
}

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  role: Role;
  isActive: boolean;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

export interface Client {
  id: string;
  code: string;
  fullName: string;
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string;
  creditLimit: number;
  currentBalance: number;
  isActive: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
  createdAt: Date;
}

export interface Product {
  id: string;
  sku: string;
  barcode?: string;
  name: string;
  description?: string;
  categoryId: string;
  costPrice: number;
  salePrice: number;
  wholesalePrice?: number;
  taxRate: number;
  trackStock: boolean;
  minStock: number;
  maxStock?: number;
  unit: string;
  allowDecimal: boolean;
  hasVariants: boolean;
  variantType?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Inventory {
  id: string;
  productId: string;
  quantity: number;
  reservedQty: number;
  lastCountedAt?: Date;
  updatedAt: Date;
}

export interface Sale {
  id: string;
  folio: string;
  clientId?: string;
  operatorId: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  paidAmount: number;
  changeAmount: number;
  status: TransactionStatus;
  paymentMethod: PaymentMethod;
  notes?: string;
  source: 'MANUAL' | 'VOICE' | 'API';
  voiceCommandId?: string;
  createdAt: Date;
  updatedAt: Date;
  cancelledAt?: Date;
  cancelledBy?: string;
  cancelledReason?: string;
}

export interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  discountPct: number;
  taxRate: number;
  lineTotal: number;
  costAtSale: number;
}

export interface Purchase {
  id: string;
  folio: string;
  supplierId: string;
  operatorId: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  paidAmount: number;
  status: TransactionStatus;
  expectedDate?: Date;
  receivedDate?: Date;
  notes?: string;
  source: 'MANUAL' | 'VOICE' | 'API';
  voiceCommandId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PurchaseItem {
  id: string;
  purchaseId: string;
  productId: string;
  quantityOrdered: number;
  quantityReceived: number;
  unitCost: number;
  taxRate: number;
  lineTotal: number;
}

export interface Supplier {
  id: string;
  code: string;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string;
  paymentTerms: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface InventoryAdjustment {
  id: string;
  folio: string;
  productId: string;
  operatorId: string;
  type: TransactionType;
  quantity: number;
  reason: string;
  reference?: string;
  createdAt: Date;
}

export interface Payment {
  id: string;
  saleId?: string;
  purchaseId?: string;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  receivedAt: Date;
  receivedBy: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

export interface SystemConfig {
  key: string;
  value: any;
  description?: string;
  updatedAt: Date;
}

export interface VoiceCommandParsed {
  intent: 'CREATE_SALE' | 'CREATE_PURCHASE' | 'CHECK_STOCK' | 'ADJUST_STOCK' | 'GET_REPORT' | 'SEARCH_PRODUCT';
  entities: {
    product?: string;
    quantity?: number;
    client?: string;
    supplier?: string;
    price?: number;
    cost?: number;
    discount?: number;
    paymentMethod?: PaymentMethod;
    expectedDate?: Date;
    reason?: string;
    reportType?: 'SALES' | 'PURCHASES' | 'TOP_PRODUCTS' | 'LOW_STOCK' | 'CASH_FLOW';
    dateRange?: { from: Date; to: Date };
    location?: string;
  };
  confidence: number;
  rawText: string;
  requiresConfirmation: boolean;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: Role;
  iat?: number;
  exp?: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  warnings?: string[];
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface StockAlert {
  productId: string;
  productName: string;
  sku: string;
  currentStock: number;
  minStock: number;
  daysUntilStockout?: number;
}