import { create } from 'zustand';
import { Product, SaleItem, Client } from '../types';

interface CartItem extends SaleItem {
  product: Product;
}

interface POSState {
  cart: CartItem[];
  client: Client | null;
  paymentMethod: string;
  payments: { method: string; amount: number; reference?: string }[];
  notes: string;
  voiceListening: boolean;
  voiceTranscript: string;
  voicePreview: any;
  
  // Cart actions
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  updateDiscount: (productId: string, discountPct: number) => void;
  clearCart: () => void;
  
  // Client
  setClient: (client: Client | null) => void;
  
  // Payment
  setPaymentMethod: (method: string) => void;
  addPayment: (method: string, amount: number, reference?: string) => void;
  removePayment: (index: number) => void;
  clearPayments: () => void;
  
  // Notes
  setNotes: (notes: string) => void;
  
  // Voice
  setVoiceListening: (listening: boolean) => void;
  setVoiceTranscript: (transcript: string) => void;
  setVoicePreview: (preview: any) => void;
  clearVoice: () => void;
  
  // Computed
  getSubtotal: () => number;
  getTaxAmount: () => number;
  getDiscountAmount: () => number;
  getTotal: () => number;
  getPaidAmount: () => number;
  getChange: () => number;
  getItemCount: () => number;
  canCheckout: () => boolean;
}

export const usePOSStore = create<POSState>((set, get) => ({
  cart: [],
  client: null,
  paymentMethod: 'CASH',
  payments: [],
  notes: '',
  voiceListening: false,
  voiceTranscript: '',
  voicePreview: null,

  addToCart: (product, quantity = 1) => {
    set(state => {
      const existing = state.cart.find(item => item.productId === product.id);
      if (existing) {
        const newQty = existing.quantity + quantity;
        // Check stock
        const available = (product.inventory?.quantity || 0) - (product.inventory?.reservedQty || 0);
        if (newQty > available) return state; // Don't add if exceeds stock
        
        return {
          cart: state.cart.map(item => 
            item.productId === product.id 
              ? { ...item, quantity: newQty, lineTotal: (item.unitPrice * newQty * (1 - item.discountPct / 100)) * (1 + item.taxRate) }
              : item
          )
        };
      }
      
      const inv = product.inventory;
      const available = (inv?.quantity || 0) - (inv?.reservedQty || 0);
      if (quantity > available) return state;
      
      const unitPrice = product.salePrice;
      const lineNet = unitPrice * quantity;
      const lineTax = lineNet * product.taxRate;
      const lineTotal = lineNet + lineTax;
      
      const newItem: CartItem = {
        id: `temp-${Date.now()}`,
        saleId: '',
        productId: product.id,
        quantity,
        unitPrice,
        discountPct: 0,
        taxRate: product.taxRate,
        lineTotal,
        costAtSale: product.costPrice,
        product
      };
      
      return { cart: [...state.cart, newItem] };
    });
  },

  removeFromCart: (productId) => {
    set(state => ({ cart: state.cart.filter(item => item.productId !== productId) }));
  },

  updateQuantity: (productId, quantity) => {
    if (quantity <= 0) {
      get().removeFromCart(productId);
      return;
    }
    set(state => {
      const item = state.cart.find(i => i.productId === productId);
      if (!item) return state;
      
      const available = (item.product.inventory?.quantity || 0) - (item.product.inventory?.reservedQty || 0);
      if (quantity > available) return state;
      
      const lineNet = item.unitPrice * quantity * (1 - item.discountPct / 100);
      const lineTax = lineNet * item.taxRate;
      
      return {
        cart: state.cart.map(i => 
          i.productId === productId 
            ? { ...i, quantity, lineTotal: lineNet + lineTax }
            : i
        )
      };
    });
  },

  updateDiscount: (productId, discountPct) => {
    set(state => ({
      cart: state.cart.map(item => {
        if (item.productId !== productId) return item;
        const lineNet = item.unitPrice * item.quantity * (1 - discountPct / 100);
        const lineTax = lineNet * item.taxRate;
        return { ...item, discountPct, lineTotal: lineNet + lineTax };
      })
    }));
  },

  clearCart: () => set({ cart: [], client: null, payments: [], notes: '' }),

  setClient: (client) => set({ client }),

  setPaymentMethod: (method) => set({ paymentMethod: method }),

  addPayment: (method, amount, reference) => {
    set(state => ({ payments: [...state.payments, { method, amount, reference }] }));
  },

  removePayment: (index) => {
    set(state => ({ payments: state.payments.filter((_, i) => i !== index) }));
  },

  clearPayments: () => set({ payments: [] }),

  setNotes: (notes) => set({ notes }),

  setVoiceListening: (listening) => set({ voiceListening: listening }),
  setVoiceTranscript: (transcript) => set({ voiceTranscript: transcript }),
  setVoicePreview: (preview) => set({ voicePreview: preview }),
  clearVoice: () => set({ voiceListening: false, voiceTranscript: '', voicePreview: null }),

  getSubtotal: () => {
    const { cart } = get();
    return cart.reduce((sum, item) => sum + item.unitPrice * item.quantity * (1 - item.discountPct / 100), 0);
  },

  getTaxAmount: () => {
    const { cart } = get();
    return cart.reduce((sum, item) => {
      const net = item.unitPrice * item.quantity * (1 - item.discountPct / 100);
      return sum + net * item.taxRate;
    }, 0);
  },

  getDiscountAmount: () => {
    const { cart } = get();
    return cart.reduce((sum, item) => sum + item.unitPrice * item.quantity * (item.discountPct / 100), 0);
  },

  getTotal: () => get().getSubtotal() + get().getTaxAmount(),

  getPaidAmount: () => {
    const { payments } = get();
    return payments.reduce((sum, p) => sum + p.amount, 0);
  },

  getChange: () => Math.max(0, get().getPaidAmount() - get().getTotal()),

  getItemCount: () => {
    const { cart } = get();
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  },

  canCheckout: () => {
    const { cart, payments, paymentMethod, getTotal, getPaidAmount } = get();
    if (cart.length === 0) return false;
    if (paymentMethod === 'CREDIT') return true;
    return getPaidAmount() >= getTotal() - 0.01;
  }
}));