import { z } from 'zod';
import { Role, TransactionStatus, PaymentMethod, TransactionType } from '../types';

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Contraseña requerida')
});

export const registerSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  fullName: z.string().min(2, 'Nombre muy corto'),
  role: z.nativeEnum(Role).default(Role.OPERATOR)
});

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().min(2),
  role: z.nativeEnum(Role)
});

export const updateUserSchema = z.object({
  fullName: z.string().min(2).optional(),
  role: z.nativeEnum(Role).optional(),
  isActive: z.boolean().optional(),
  avatarUrl: z.string().url().optional().nullable()
});

export const createClientSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  taxId: z.string().optional().nullable(),
  creditLimit: z.number().min(0).default(0),
  notes: z.string().optional().nullable()
});

export const updateClientSchema = createClientSchema.partial();

export const createCategorySchema = z.object({
  name: z.string().min(2),
  description: z.string().optional().nullable(),
  parentId: z.string().optional().nullable()
});

export const createProductSchema = z.object({
  sku: z.string().min(3),
  barcode: z.string().optional().nullable(),
  name: z.string().min(2),
  description: z.string().optional().nullable(),
  categoryId: z.string(),
  costPrice: z.number().min(0),
  salePrice: z.number().min(0),
  wholesalePrice: z.number().min(0).optional().nullable(),
  taxRate: z.number().min(0).max(1).default(0.16),
  trackStock: z.boolean().default(true),
  minStock: z.number().min(0).default(0),
  maxStock: z.number().min(0).optional().nullable(),
  unit: z.string().default('PZA'),
  allowDecimal: z.boolean().default(false),
  hasVariants: z.boolean().default(false),
  variantType: z.string().optional().nullable()
});

export const updateProductSchema = createProductSchema.partial();

export const createSaleSchema = z.object({
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().positive(),
    unitPrice: z.number().min(0).optional(),
    discountPct: z.number().min(0).max(100).default(0)
  })).min(1, 'Al menos un producto'),
  clientId: z.string().optional().nullable(),
  paymentMethod: z.nativeEnum(PaymentMethod).default(PaymentMethod.CASH),
  payments: z.array(z.object({
    method: z.nativeEnum(PaymentMethod),
    amount: z.number().positive(),
    reference: z.string().optional().nullable()
  })).min(1),
  notes: z.string().optional().nullable(),
  source: z.enum(['MANUAL', 'VOICE', 'API']).default('MANUAL'),
  voiceCommandId: z.string().optional().nullable()
});

export const createPurchaseSchema = z.object({
  supplierId: z.string(),
  items: z.array(z.object({
    productId: z.string(),
    quantityOrdered: z.number().positive(),
    unitCost: z.number().min(0),
    taxRate: z.number().min(0).max(1).default(0.16)
  })).min(1),
  expectedDate: z.string().datetime().optional().nullable(),
  notes: z.string().optional().nullable(),
  source: z.enum(['MANUAL', 'VOICE', 'API']).default('MANUAL'),
  voiceCommandId: z.string().optional().nullable()
});

export const createAdjustmentSchema = z.object({
  productId: z.string(),
  type: z.nativeEnum(TransactionType),
  quantity: z.number().refine(val => val !== 0, 'La cantidad no puede ser cero'),
  reason: z.string().min(3),
  reference: z.string().optional().nullable()
});

export const voiceCommandSchema = z.object({
  parsedCommand: z.object({
    intent: z.enum(['CREATE_SALE', 'CREATE_PURCHASE', 'CHECK_STOCK', 'ADJUST_STOCK', 'GET_REPORT', 'SEARCH_PRODUCT']),
    entities: z.record(z.any()),
    confidence: z.number().min(0).max(1),
    rawText: z.string(),
    requiresConfirmation: z.boolean()
  }),
  confirm: z.boolean().optional()
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

export const dateRangeSchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional()
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type CreateClientInput = z.infer<typeof createClientSchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type CreateSaleInput = z.infer<typeof createSaleSchema>;
export type CreatePurchaseInput = z.infer<typeof createPurchaseSchema>;
export type VoiceCommandInput = z.infer<typeof voiceCommandSchema>;