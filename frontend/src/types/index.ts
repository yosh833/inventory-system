export enum Role {
  ADMIN = 'ADMIN',
  OPERATOR = 'OPERATOR',
  CLIENT = 'CLIENT'
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

export enum TransactionType {
  SALE = 'SALE',
  PURCHASE = 'PURCHASE',
  ADJUSTMENT_IN = 'ADJUSTMENT_IN',
  ADJUSTMENT_OUT = 'ADJUSTMENT_OUT',
  TRANSFER = 'TRANSFER'
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  isActive: boolean;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
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
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
  createdAt: string;
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
  createdAt: string;
  updatedAt: string;
  inventory?: Inventory;
  categoryName?: string;
}

export interface Inventory {
  id: string;
  productId: string;
  quantity: number;
  reservedQty: number;
  lastCountedAt?: string;
  updatedAt: string;
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
  createdAt: string;
  updatedAt: string;
  cancelledAt?: string;
  cancelledBy?: string;
  cancelledReason?: string;
  clientName?: string;
  operatorName?: string;
  itemCount?: number;
  items?: SaleItem[];
  client?: Client;
  operator?: User;
  payments?: Payment[];
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
  productName?: string;
  productSku?: string;
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
  expectedDate?: string;
  receivedDate?: string;
  notes?: string;
  source: 'MANUAL' | 'VOICE' | 'API';
  voiceCommandId?: string;
  createdAt: string;
  updatedAt: string;
  supplierName?: string;
  operatorName?: string;
  itemCount?: number;
  items?: PurchaseItem[];
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
  productName?: string;
  productSku?: string;
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
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  saleId?: string;
  purchaseId?: string;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  receivedAt: string;
  receivedBy: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface VoiceCommandParsed {
  intent: 'CREATE_SALE' | 'CREATE_PURCHASE' | 'CHECK_STOCK' | 'ADJUST_STOCK' | 'GET_REPORT' | 'SEARCH_PRODUCT';
  entities: Record<string, any>;
  confidence: number;
  rawText: string;
  requiresConfirmation: boolean;
}

export interface VoicePreview {
  type: 'SALE' | 'PURCHASE';
  message: string;
  summary: Record<string, any>;
}

export interface VoiceCommandResult {
  success: boolean;
  data?: any;
  message?: string;
  requiresConfirmation?: boolean;
  preview?: VoicePreview;
  voiceCommandId?: string;
  error?: string;
}