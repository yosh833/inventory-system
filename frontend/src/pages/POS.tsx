import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Search, ShoppingCart, UserPlus, CreditCard, DollarSign, 
  Mic, MicOff, Barcode, X, Check, AlertTriangle, 
  Plus, Minus, Trash2, Receipt, Printer, Package
} from 'lucide-react';
import { api } from '../api/client';
import { usePOSStore } from '../store/pos.store';
import { useAuth } from '../hooks/useAuth';
import { useVoice } from '../hooks/useVoice';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Table } from '../components/ui/Table';
import { formatCurrency, cn } from '../utils/format';
import { Product, Client, PaymentMethod } from '../types';
import toast from 'react-hot-toast';

function ProductCard({ product, onAdd, inCartQty = 0, maxAvailable }: { 
  product: Product; 
  onAdd: () => void;
  inCartQty: number;
  maxAvailable: number;
}) {
  const isLowStock = maxAvailable <= (product.minStock || 5) && maxAvailable > 0;
  const isOutOfStock = maxAvailable <= 0;

  return (
    <div className={cn(
      'card p-4 flex flex-col h-full transition-all',
      isOutOfStock && 'opacity-40 bg-gray-50',
      isLowStock && !isOutOfStock && 'border-yellow-300'
    )}>
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs text-gray-500 font-mono">{product.sku}</span>
        {isLowStock && !isOutOfStock && (
          <AlertTriangle className="w-4 h-4 text-yellow-500" />
        )}
      </div>
      
      <h3 className="font-medium text-gray-900 mb-1 line-clamp-2 flex-1">{product.name}</h3>
      
      <div className="flex items-center justify-between mb-3">
        <span className="text-lg font-bold text-gray-900">
          {formatCurrency(product.salePrice)}
        </span>
        <span className={cn(
          'text-xs px-2 py-0.5 rounded',
          isOutOfStock ? 'bg-red-100 text-red-700' :
          isLowStock ? 'bg-yellow-100 text-yellow-700' :
          'bg-green-100 text-green-700'
        )}>
          {isOutOfStock ? 'Agotado' : `${maxAvailable} disp.`}
        </span>
      </div>

      <div className="flex gap-2">
        <Button
          variant={inCartQty > 0 ? 'primary' : 'secondary'}
          size="sm"
          className="flex-1"
          onClick={onAdd}
          disabled={isOutOfStock}
          aria-label={inCartQty > 0 ? `Agregar otro ${product.name}` : `Agregar ${product.name}`}
        >
          {inCartQty > 0 ? (
            <>+ Agregar ({inCartQty} en carrito)</>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              Agregar
            </>
          )}
        </Button>
        {inCartQty > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {}} // Handled by cart
            className="px-2"
            aria-label="Ver en carrito"
          >
            <ShoppingCart className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

function CartSidebar() {
  const { 
    cart, client, paymentMethod, payments, notes,
    getSubtotal, getTaxAmount, getTotal, getPaidAmount, getChange, getItemCount, canCheckout,
    removeFromCart, updateQuantity, updateDiscount, setClient, setPaymentMethod,
    addPayment, removePayment, clearPayments, setNotes, clearCart
  } = usePOSStore();

  const { data: clients } = useQuery({ queryKey: ['clients'], queryFn: () => api.getClients({ pageSize: 100 }) });
  const queryClient = useQueryClient();
  const [showClientSearch, setShowClientSearch] = useState(false);
  const [paymentMethodInput, setPaymentMethodInput] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentRef, setPaymentRef] = useState('');

  const createSaleMutation = useMutation({
    mutationFn: (data: any) => api.createSale(data),
    onSuccess: (response) => {
      toast.success(`Venta ${response.data.sale.folio} registrada`);
      clearCart();
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['low-stock'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Error al registrar venta')
  });

  const handleCheckout = () => {
    if (cart.length === 0) return;
    
    const saleData = {
      items: cart.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountPct: item.discountPct
      })),
      clientId: client?.id || null,
      paymentMethod: paymentMethod as PaymentMethod,
      payments: payments.map(p => ({ method: p.method, amount: p.amount, reference: p.reference })),
      notes,
      source: 'MANUAL'
    };
    
    createSaleMutation.mutate(saleData);
  };

  const subtotal = getSubtotal();
  const tax = getTaxAmount();
  const total = getTotal();
  const paid = getPaidAmount();
  const change = getChange();
  const itemCount = getItemCount();

  return (
    <aside className="w-full lg:w-80 bg-white border-l border-gray-200 flex flex-col h-[calc(100vh-4rem)] sticky top-16">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Carrito ({itemCount})</h2>
        {cart.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => { if(confirm('¿Limpiar carrito?')) clearCart(); }}>
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Client Selector */}
      <div className="p-4 border-b border-gray-100">
        <label className="label">Cliente</label>
        <div className="relative">
          <Input
            placeholder={client ? client.fullName : 'Público general (F3)'}
            value={client?.fullName || ''}
            readOnly
            onClick={() => setShowClientSearch(true)}
            endAdornment={
              client ? (
                <Button variant="ghost" size="sm" onClick={() => setClient(null)} className="p-1">
                  <X className="w-4 h-4" />
                </Button>
              ) : (
                <UserPlus className="w-5 h-5 text-gray-400" />
              )
            }
          />
        </div>
      </div>

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {cart.length === 0 ? (
          <div className="text-center text-gray-500 py-12">
            <ShoppingCart className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>Carrito vacío</p>
            <p className="text-sm">Agrega productos desde la lista</p>
          </div>
        ) : (
          cart.map((item, idx) => (
            <div key={item.id} className="flex gap-3 p-2 bg-gray-50 rounded-lg">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{item.product.name}</p>
                <p className="text-xs text-gray-500">${item.unitPrice.toFixed(2)} c/u</p>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" className="p-1" onClick={() => updateQuantity(item.productId, item.quantity - 1)} aria-label="Disminuir">
                  <Minus className="w-4 h-4" />
                </Button>
                <span className="w-10 text-center text-sm font-medium">{item.quantity}</span>
                <Button variant="ghost" size="sm" className="p-1" onClick={() => updateQuantity(item.productId, item.quantity + 1)} aria-label="Aumentar">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <Button variant="ghost" size="sm" className="p-1 text-red-500" onClick={() => removeFromCart(item.productId)} aria-label="Eliminar">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))
        )}
      </div>

      {/* Discounts per item */}
      {cart.length > 0 && (
        <div className="px-4 pb-4">
          {cart.map(item => (
            <div key={item.id} className="mb-2">
              <label className="label text-xs">Desc. {item.product.name} (%)</label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={item.discountPct}
                onChange={e => updateDiscount(item.productId, parseFloat(e.target.value) || 0)}
                className="text-sm"
              />
            </div>
          ))}
        </div>
      )}

      {/* Totals */}
      <div className="p-4 border-t border-gray-100 space-y-2 bg-gray-50">
        <div className="flex justify-between text-sm"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
        <div className="flex justify-between text-sm"><span>IVA</span><span>{formatCurrency(tax)}</span></div>
        {cart.some(i => i.discountPct > 0) && (
          <div className="flex justify-between text-sm text-green-600">
            <span>Descuentos</span>
            <span>-{formatCurrency(cart.reduce((s, i) => s + i.unitPrice * i.quantity * (i.discountPct/100), 0))}</span>
          </div>
        )}
        <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2">
          <span>TOTAL</span>
          <span>{formatCurrency(total)}</span>
        </div>
      </div>

      {/* Payments */}
      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <label className="label mb-0">Pagos</label>
          <select 
            value={paymentMethod} 
            onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
            className="input text-sm py-1"
          >
            <option value="CASH">Efectivo</option>
            <option value="CARD">Tarjeta</option>
            <option value="TRANSFER">Transferencia</option>
            <option value="CREDIT">Crédito</option>
            <option value="MIXED">Mixto</option>
          </select>
        </div>

        {paymentMethod !== 'CREDIT' && (
          <div className="space-y-2 mb-3">
            <div className="grid grid-cols-3 gap-2">
              <Input 
                type="number" 
                step="0.01" 
                placeholder="Monto" 
                value={paymentAmount}
                onChange={e => setPaymentAmount(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addPaymentFn()}
                className="text-sm"
              />
              <Input 
                placeholder="Ref. (opcional)" 
                value={paymentRef}
                onChange={e => setPaymentRef(e.target.value)}
                className="text-sm"
              />
              <Button size="sm" onClick={addPaymentFn} disabled={!paymentAmount || parseFloat(paymentAmount) <= 0}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {payments.map((p, i) => (
              <div key={i} className="flex items-center justify-between text-sm bg-gray-50 px-2 py-1 rounded">
                <span>{p.method}: {formatCurrency(p.amount)}</span>
                <Button variant="ghost" size="sm" className="p-1" onClick={() => removePayment(i)}>
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-1 text-sm">
          <div className="flex justify-between"><span>Pagado</span><span className="font-medium">{formatCurrency(paid)}</span></div>
          <div className="flex justify-between"><span>Cambio</span><span className="font-medium text-green-600">{formatCurrency(change)}</span></div>
          {paymentMethod === 'CREDIT' && client && (
            <div className="flex justify-between text-orange-600"><span>Queda a cuenta</span><span className="font-medium">{formatCurrency(total - paid)}</span></div>
          )}
        </div>
      </div>

      {/* Notes */}
      <div className="p-4 border-t border-gray-100">
        <label className="label">Notas</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Notas de la venta..."
          rows={2}
          className="input text-sm"
        />
      </div>

      {/* Checkout Button */}
      <div className="p-4 border-t border-gray-100">
        <Button 
          className="w-full" 
          size="lg"
          onClick={handleCheckout}
          disabled={cart.length === 0 || !canCheckout() || createSaleMutation.isPending}
          loading={createSaleMutation.isPending}
        >
          {cart.length === 0 ? 'Carrito vacío' : `Cobrar ${formatCurrency(total)}`}
        </Button>
        <p className="text-xs text-center text-gray-500 mt-2">
          F2: Cobrar | F3: Cliente | F4: Voz | Esc: Limpiar
        </p>
      </div>
    </aside>
  );

  function addPaymentFn() {
    const amount = parseFloat(paymentAmount);
    if (amount > 0) {
      addPayment(paymentMethod, amount, paymentRef);
      setPaymentAmount('');
      setPaymentRef('');
    }
  }
}

function VoiceModal({ isOpen, onClose, transcript, preview, onConfirm, onCancel, isProcessing }) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} title="Comando de voz" size="md">
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <div className={cn('w-10 h-10 rounded-full flex items-center justify-center', isProcessing ? 'bg-blue-100 text-blue-600 animate-pulse' : 'bg-primary-100 text-primary-600')}>
            {isProcessing ? (
              <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
            ) : (
              isOpen && !preview ? <Mic className="w-5 h-5" /> : <Check className="w-5 h-5 text-green-600" />
            )}
          </div>
          <div>
            <p className="font-medium">{isProcessing ? 'Procesando...' : preview ? 'Confirmar acción' : 'Escuchando...'}</p>
            <p className="text-sm text-gray-500">{transcript || 'Di tu comando...'}</p>
          </div>
        </div>

        {preview && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="font-medium text-blue-800 mb-2">{preview.message}</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-gray-500">Producto:</span> <span className="font-medium">{preview.summary.product}</span></div>
              <div><span className="text-gray-500">Cantidad:</span> <span className="font-medium">{preview.summary.quantity}</span></div>
              {preview.summary.client && <div className="col-span-2"><span className="text-gray-500">Cliente:</span> <span className="font-medium">{preview.summary.client}</span></div>}
              <div className="col-span-2"><span className="text-gray-500">Total:</span> <span className="font-bold text-lg">{formatCurrency(preview.summary.total)}</span></div>
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button variant="secondary" className="flex-1" onClick={onCancel} disabled={isProcessing}>
            Cancelar
          </Button>
          <Button variant={preview?.type === 'SALE' ? 'primary' : 'primary'} className="flex-1" onClick={onConfirm} disabled={isProcessing || !preview}>
            {preview ? 'Confirmar' : 'Esperando...'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function POS() {
  const { user, isOperator } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showBarcodeInput, setShowBarcodeInput] = useState(false);
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);

  const { data: productsResponse } = useQuery({
    queryKey: ['products', 'pos', searchQuery, selectedCategory],
    queryFn: () => api.getProducts({ pageSize: 200, search: searchQuery, categoryId: selectedCategory || undefined, isActive: true }),
    staleTime: 30000
  });

  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: () => api.getCategories() });

  const { 
    cart, 
    addToCart, 
    voiceListening, 
    voiceTranscript, 
    voicePreview,
    setVoiceListening,
    setVoicePreview,
    clearVoice,
    getItemCount
  } = usePOSStore();

  const { startListening, confirmCommand, cancelCommand, clearError } = useVoice({
    onResult: () => {
      setVoiceModalOpen(false);
      clearVoice();
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
    onError: (err) => toast.error(err)
  });

  // Handle voice command preview
  useEffect(() => {
    if (voicePreview) {
      setVoicePreview(voicePreview);
      setVoiceModalOpen(true);
    }
  }, [voicePreview]);

  // Handle barcode scanner input
  const handleBarcodeScan = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    const target = e.currentTarget;
    if (target instanceof HTMLInputElement && e.key === 'Enter' && target.value.trim()) {
      const code = target.value.trim();
      target.value = '';
      handleProductCode(code);
    }
  }, []);

  const handleProductCode = async (code: string) => {
    try {
      const response = await api.getProductByCode(code);
      const product = response.data;
      if (product) {
        addToCart(product);
        toast.success(`Agregado: ${product.name}`);
      }
    } catch {
      toast.error('Producto no encontrado');
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      switch (e.key) {
        case 'F2': e.preventDefault(); (document.querySelector('[data-checkout]') as HTMLElement | null)?.click(); break;
        case 'F3': e.preventDefault(); (document.querySelector('[data-client]') as HTMLElement | null)?.click(); break;
        case 'F4': e.preventDefault(); startListening(); break;
        case 'Escape': e.preventDefault(); clearVoice(); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [startListening]);

  const filteredProducts = productsResponse?.data?.data || [];
  const inCartMap = new Map(cart.map(item => [item.productId, item.quantity]));

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col lg:flex-row">
      {/* Main Product Area */}
      <main className="flex-1 overflow-y-auto p-4 lg:p-6">
        {/* Header with search and voice */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6 items-start sm:items-center justify-between">
          <div className="flex-1 max-w-xl">
            <label className="sr-only">Buscar productos</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar producto (nombre, SKU, código)..."
                className="input pl-10"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="input w-auto py-2"
            >
              <option value="">Todas las categorías</option>
              {categories?.data?.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            {/* Barcode Scanner Toggle */}
            <Button variant="ghost" onClick={() => { setShowBarcodeInput(!showBarcodeInput); setTimeout(() => barcodeInputRef.current?.focus(), 0); }}>
              <Barcode className="w-5 h-5" />
              <span className="hidden sm:inline">Escanear</span>
            </Button>

            {/* Voice Button */}
            <Button
              variant={voiceListening ? 'danger' : 'secondary'}
              onClick={() => { setVoiceModalOpen(true); startListening(); }}
              className="gap-2"
              aria-label={voiceListening ? 'Detener escucha' : 'Comando de voz'}
            >
              {voiceListening ? <Mic className="w-5 h-5 animate-pulse" /> : <MicOff className="w-5 h-5" />}
              <span className="hidden sm:inline">Voz</span>
            </Button>
          </div>
        </div>

        {/* Barcode Input */}
        {showBarcodeInput && (
          <div className="mb-4 flex gap-2">
            <Input
              ref={barcodeInputRef}
              type="text"
              placeholder="Escanea o escribe código de barras/SKU y presiona Enter"
              onKeyDown={handleBarcodeScan}
              autoFocus
              endAdornment={
                <Button variant="ghost" size="sm" onClick={() => setShowBarcodeInput(false)}>
                  <X className="w-4 h-4" />
                </Button>
              }
            />
          </div>
        )}

        {/* Product Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {filteredProducts.length === 0 ? (
            <div className="col-span-full text-center py-12 text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>No se encontraron productos</p>
            </div>
          ) : (
            filteredProducts.map(product => {
              const inv = product.inventory;
              const available = (inv?.quantity || 0) - (inv?.reservedQty || 0);
              const inCartQty = inCartMap.get(product.id) || 0;
              return (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAdd={() => addToCart(product)}
                  inCartQty={inCartQty}
                  maxAvailable={available}
                />
              );
            })
          )}
        </div>

        {filteredProducts.length === 0 && searchQuery && (
          <div className="mt-8 text-center">
            <Button variant="secondary" onClick={() => setSearchQuery('')}>Limpiar búsqueda</Button>
          </div>
        )}
      </main>

      {/* Cart Sidebar */}
      <CartSidebar />

      {/* Voice Modal */}
      <VoiceModal
        isOpen={voiceModalOpen}
        onClose={() => { setVoiceModalOpen(false); cancelCommand(); clearVoice(); }}
        transcript={voiceTranscript}
        preview={voicePreview}
        onConfirm={confirmCommand}
        onCancel={() => { setVoiceModalOpen(false); cancelCommand(); clearVoice(); }}
        isProcessing={voiceListening}
      />
    </div>
  );
}