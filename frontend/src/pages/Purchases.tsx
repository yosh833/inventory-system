import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, Search, Filter, Package, Truck, ShoppingBag, 
  Edit, Eye, CheckCircle, XCircle, Clock, AlertTriangle,
  ChevronDown, Save, X, PlusCircle, MinusCircle, FileText
} from 'lucide-react';
import { api } from '../api/client';
import { Button } from '../components/ui/Button';
import { Input, Textarea, Select } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Table, Pagination } from '../components/ui/Table';
import { formatCurrency, formatDate, getStatusBadge, cn } from '../utils/format';
import { Purchase, PurchaseItem, Supplier, Product } from '../types';
import toast from 'react-hot-toast';

function PurchaseFormModal({ 
  isOpen, onClose, purchase, suppliers, products, onSubmit, loading, mode = 'create' 
}: { 
  isOpen: boolean; onClose: () => void; purchase: Purchase | null; 
  suppliers: Supplier[]; products: Product[]; onSubmit: (data: any) => void; 
  loading: boolean; mode?: 'create' | 'receive' 
}) {
  const [formData, setFormData] = useState({
    supplierId: '', expectedDate: '', notes: '',
    items: [{ productId: '', quantityOrdered: 1, unitCost: 0, taxRate: 0.16 }]
  });
  const [receivingItems, setReceivingItems] = useState<Record<string, number>>({});

  useEffect(() => {
    if (purchase && mode === 'create') {
      setFormData({
        supplierId: purchase.supplierId || '',
        expectedDate: purchase.expectedDate ? purchase.expectedDate.split('T')[0] : '',
        notes: purchase.notes || '',
        items: purchase.items?.map((i: any) => ({
          productId: i.productId,
          quantityOrdered: i.quantityOrdered,
          unitCost: i.unitCost,
          taxRate: i.taxRate
        })) || [{ productId: '', quantityOrdered: 1, unitCost: 0, taxRate: 0.16 }]
      });
    } else if (purchase && mode === 'receive') {
      const items: Record<string, number> = {};
      purchase.items?.forEach((i: any) => {
        const pending = i.quantityOrdered - i.quantityReceived;
        if (pending > 0) items[i.id] = pending;
      });
      setReceivingItems(items);
    }
  }, [purchase, mode, isOpen]);

  const addItem = () => setFormData(fd => ({ ...fd, items: [...fd.items, { productId: '', quantityOrdered: 1, unitCost: 0, taxRate: 0.16 }] }));
  const removeItem = (idx: number) => setFormData(fd => ({ ...fd, items: fd.items.filter((_, i) => i !== idx) }));
  const updateItem = (idx: number, field: string, value: any) => setFormData(fd => ({ ...fd, items: fd.items.map((it, i) => i === idx ? { ...it, [field]: value } : it) }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'create') {
      onSubmit(formData);
    } else {
      const items = Object.entries(receivingItems).filter(([_, qty]) => qty > 0).map(([itemId, qty]) => ({ itemId, quantityReceived: qty }));
      onSubmit(items);
    }
  };

  const calcLineTotal = (item: any) => item.unitCost * item.quantityOrdered * (1 + item.taxRate);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={mode === 'receive' ? `Recibir: ${purchase?.folio}` : purchase ? 'Editar Compra' : 'Nueva Orden de Compra'} size="xl">
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto">
        {mode === 'create' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select label="Proveedor *" value={formData.supplierId} onChange={e => setFormData({...formData, supplierId: e.target.value})} 
              options={suppliers.map(s => ({ value: s.id, label: `${s.code} - ${s.name}` }))} required />
            <Input label="Fecha esperada" type="date" value={formData.expectedDate} onChange={e => setFormData({...formData, expectedDate: e.target.value})} />
          </div>
        )}

        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium">{mode === 'receive' ? 'Items a recibir' : 'Productos'}</h3>
            {mode === 'create' && <Button type="button" variant="ghost" size="sm" onClick={addItem}><PlusCircle className="w-4 h-4" /> Agregar</Button>}
          </div>
          <div className="space-y-2">
            {mode === 'receive' 
              ? Object.entries(receivingItems).map(([itemId, maxQty]) => {
                  const item = purchase?.items?.find((i: any) => i.id === itemId);
                  const product = products.find(p => p.id === item?.productId);
                  return (
                    <div key={itemId} className="flex gap-2 p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{product?.name || item?.productName}</p>
                        <p className="text-sm text-gray-500">Pendiente: {maxQty} {product?.unit}</p>
                      </div>
                      <Input type="number" min="0" max={maxQty} step={product?.allowDecimal ? 0.01 : 1} 
                        value={receivingItems[itemId]} 
                        onChange={e => setReceivingItems({...receivingItems, [itemId]: parseFloat(e.target.value) || 0})} 
                        className="w-24" />
                    </div>
                  );
                })
              : formData.items.map((item, idx) => (
                  <div key={idx} className="flex gap-2 p-3 bg-gray-50 rounded-lg">
                    <Select value={item.productId} onChange={e => updateItem(idx, 'productId', e.target.value)} 
                      options={[{ value: '', label: 'Seleccionar...' }, ...products.map(p => ({ value: p.id, label: `${p.sku} - ${p.name}` }))]} 
                      className="flex-1" required />
                    <Input type="number" min="1" step={1} label="Cant." value={item.quantityOrdered} onChange={e => updateItem(idx, 'quantityOrdered', parseInt(e.target.value))} className="w-24" required />
                    <Input type="number" min="0" step="0.01" label="Costo" value={item.unitCost} onChange={e => updateItem(idx, 'unitCost', parseFloat(e.target.value))} className="w-28" required />
                    <Input type="number" min="0" max="1" step="0.001" label="IVA" value={item.taxRate} onChange={e => updateItem(idx, 'taxRate', parseFloat(e.target.value))} className="w-24" />
                    <div className="flex items-center px-3 text-sm text-gray-500 w-28">
                      {calcLineTotal(item).toFixed(2)}
                    </div>
                    {formData.items.length > 1 && (
                      <Button type="button" variant="ghost" size="sm" className="text-red-500" onClick={() => removeItem(idx)}><MinusCircle className="w-4 h-4" /></Button>
                    )}
                  </div>
                ))}
          </div>
        </div>

        {mode === 'create' && (
          <div className="border-t pt-4">
            <Textarea label="Notas" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} rows={2} />
          </div>
        )}

        {mode === 'create' && (
          <div className="bg-gray-50 p-4 rounded-lg border-t">
            <div className="grid grid-cols-3 gap-4 text-right">
              <div>
                <p className="text-sm text-gray-500">Subtotal</p>
                <p className="font-bold">{formatCurrency(formData.items.reduce((s, i) => s + i.unitCost * i.quantityOrdered, 0))}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">IVA</p>
                <p className="font-bold">{formatCurrency(formData.items.reduce((s, i) => s + i.unitCost * i.quantityOrdered * i.taxRate, 0))}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total</p>
                <p className="font-bold text-lg">{formatCurrency(formData.items.reduce((s, i) => s + i.unitCost * i.quantityOrdered * (1 + i.taxRate), 0))}</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={loading}>
            {mode === 'receive' ? 'Confirmar Recepción' : purchase ? 'Actualizar' : 'Crear Orden'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function SupplierModal({ isOpen, onClose, supplier, onSubmit, loading }: { 
  isOpen: boolean; onClose: () => void; supplier: Supplier | null; onSubmit: (data: any) => void; loading: boolean }) {
  const [formData, setFormData] = useState({
    name: '', contactName: '', email: '', phone: '', address: '', taxId: '', paymentTerms: 30
  });

  useEffect(() => {
    if (supplier) setFormData({ name: supplier.name, contactName: supplier.contactName || '', email: supplier.email || '', phone: supplier.phone || '', address: supplier.address || '', taxId: supplier.taxId || '', paymentTerms: supplier.paymentTerms });
    else setFormData({ name: '', contactName: '', email: '', phone: '', address: '', taxId: '', paymentTerms: 30 });
  }, [supplier, isOpen]);

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSubmit(formData); };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={supplier ? 'Editar Proveedor' : 'Nuevo Proveedor'} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Nombre *" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Contacto" value={formData.contactName} onChange={e => setFormData({...formData, contactName: e.target.value})} />
          <Input label="Teléfono" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
        </div>
        <Input label="Email" type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
        <Input label="RFC" value={formData.taxId} onChange={e => setFormData({...formData, taxId: e.target.value})} />
        <Input label="Días de crédito" type="number" min="0" value={formData.paymentTerms} onChange={e => setFormData({...formData, paymentTerms: parseInt(e.target.value)})} />
        <Textarea label="Dirección" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} rows={2} />
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={loading}>{supplier ? 'Actualizar' : 'Crear'}</Button>
        </div>
      </form>
    </Modal>
  );
}

export function Purchases() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [activeTab, setActiveTab] = useState<'purchases' | 'suppliers'>('purchases');
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [receiveMode, setReceiveMode] = useState(false);

  const { data: purchasesResponse, isLoading } = useQuery({
    queryKey: ['purchases', page, pageSize, search, statusFilter, supplierFilter],
    queryFn: () => api.getPurchases({ page, pageSize, search, status: statusFilter || undefined, supplierId: supplierFilter || undefined }),
    placeholderData: (prev) => prev
  });

  const { data: suppliers } = useQuery({ queryKey: ['suppliers'], queryFn: () => api.getSuppliers() });
  const { data: products } = useQuery({ queryKey: ['products', 'purchases'], queryFn: () => api.getProducts({ pageSize: 500, isActive: true }) });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.createPurchase(data),
    onSuccess: () => { toast.success('Orden creada'); setFormModalOpen(false); queryClient.invalidateQueries({ queryKey: ['purchases'] }); }
  });

  const receiveMutation = useMutation({
    mutationFn: ({ id, items }: { id: string; items: any[] }) => api.receivePurchase(id, items),
    onSuccess: () => { toast.success('Recepción registrada'); setFormModalOpen(false); queryClient.invalidateQueries({ queryKey: ['purchases'] }); queryClient.invalidateQueries({ queryKey: ['products'] }); }
  });

  const supplierCreateMutation = useMutation({
    mutationFn: (data: any) => api.createSupplier(data),
    onSuccess: () => { toast.success('Proveedor creado'); setSupplierModalOpen(false); queryClient.invalidateQueries({ queryKey: ['suppliers'] }); }
  });

  const supplierUpdateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.updateSupplier?.(id, data) || Promise.resolve(),
    onSuccess: () => { toast.success('Proveedor actualizado'); setSupplierModalOpen(false); queryClient.invalidateQueries({ queryKey: ['suppliers'] }); }
  });

  const purchasesColumns = [
    { key: 'folio', header: 'Folio', className: 'font-mono' },
    { key: 'supplierName', header: 'Proveedor' },
    { key: 'status', header: 'Estado', render: (p: Purchase) => {
      const { className, label } = getStatusBadge(p.status);
      return <span className={className}>{label}</span>;
    }},
    { key: 'total', header: 'Total', render: (p: Purchase) => formatCurrency(p.total) },
    { key: 'paidAmount', header: 'Pagado', render: (p: Purchase) => formatCurrency(p.paidAmount) },
    { key: 'expectedDate', header: 'Fecha Esperada', render: (p: Purchase) => p.expectedDate ? formatDate(p.expectedDate) : '-', className: 'hidden md:table-cell' },
    { key: 'actions', header: '', render: (p: Purchase) => (
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={() => { setEditingPurchase(p); setReceiveMode(false); setFormModalOpen(true); }} aria-label="Ver/Editar"><Eye className="w-4 h-4" /></Button>
        {p.status === 'PENDING' && (
          <Button variant="ghost" size="sm" onClick={() => { setEditingPurchase(p); setReceiveMode(true); setFormModalOpen(true); }} aria-label="Recibir mercancía">
            <Truck className="w-4 h-4" />
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={() => { if(confirm('¿Cancelar orden?')) { /* cancel */ }} } aria-label="Cancelar" className="text-red-500"><XCircle className="w-4 h-4" /></Button>
      </div>
    )}
  ];

  const suppliersColumns = [
    { key: 'code', header: 'Código', className: 'font-mono' },
    { key: 'name', header: 'Nombre', render: (s: Supplier) => (
      <div><p className="font-medium">{s.name}</p><p className="text-xs text-gray-500">{s.contactName}</p></div>
    )},
    { key: 'email', header: 'Email', className: 'hidden md:table-cell' },
    { key: 'phone', header: 'Teléfono', className: 'hidden md:table-cell' },
    { key: 'paymentTerms', header: 'Crédito', render: (s: Supplier) => `${s.paymentTerms} días` },
    { key: 'status', header: 'Estado', render: (s: Supplier) => {
      const { className, label } = getStatusBadge(s.isActive ? 'ACTIVE' : 'INACTIVE');
      return <span className={className}>{label}</span>;
    }},
    { key: 'actions', header: '', render: (s: Supplier) => (
      <div className="flex gap-1">
        <Button variant="ghost" size="sm" onClick={() => { setEditingSupplier(s); setSupplierModalOpen(true); }}><Edit className="w-4 h-4" /></Button>
      </div>
    )}
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-primary-600" /> Compras
          </h1>
          <p className="text-gray-500">Órdenes de compra y proveedores</p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'purchases' && (
            <Button variant="secondary" onClick={() => { setEditingPurchase(null); setReceiveMode(false); setFormModalOpen(true); }}>
              <Plus className="w-4 h-4" /> Nueva Orden
            </Button>
          )}
          {activeTab === 'suppliers' && (
            <Button variant="secondary" onClick={() => { setEditingSupplier(null); setSupplierModalOpen(true); }}>
              <Plus className="w-4 h-4" /> Nuevo Proveedor
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4" role="tablist">
          <button role="tab" aria-selected={activeTab === 'purchases'} onClick={() => setActiveTab('purchases')} 
            className={cn('px-4 py-2 text-sm font-medium border-b-2 transition-colors', activeTab === 'purchases' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700')}>
            <ShoppingBag className="w-4 h-4 inline mr-1" /> Órdenes ({purchasesResponse?.data?.total || 0})
          </button>
          <button role="tab" aria-selected={activeTab === 'suppliers'} onClick={() => setActiveTab('suppliers')} 
            className={cn('px-4 py-2 text-sm font-medium border-b-2 transition-colors', activeTab === 'suppliers' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700')}>
            <Truck className="w-4 h-4 inline mr-1" /> Proveedores ({suppliers?.data?.length || 0})
          </button>
        </nav>
      </div>

      {activeTab === 'purchases' && (
        <>
          {/* Filters */}
          <div className="card p-4 flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Buscar folio..." className="input pl-10" />
            </div>
            <Select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} 
              options={[{ value: '', label: 'Todos' }, { value: 'PENDING', label: 'Pendiente' }, { value: 'CONFIRMED', label: 'Recibida' }, { value: 'CANCELLED', label: 'Cancelada' }]} className="w-auto min-w-[160px]" />
            <Select value={supplierFilter} onChange={e => { setSupplierFilter(e.target.value); setPage(1); }} 
              options={[{ value: '', label: 'Todos' }, ...(suppliers?.data?.map((s: Supplier) => ({ value: s.id, label: s.name })) || [])]} className="w-auto min-w-[200px]" />
          </div>

          {/* Table */}
          <Table columns={purchasesColumns} data={purchasesResponse?.data?.data || []} keyExtractor={(p: Purchase) => p.id} loading={isLoading} emptyMessage="No hay órdenes de compra" />
          {purchasesResponse?.data && <Pagination currentPage={purchasesResponse.data.page} totalPages={purchasesResponse.data.totalPages} onPageChange={setPage} />}
        </>
      )}

      {activeTab === 'suppliers' && (
        <>
          <Table columns={suppliersColumns} data={suppliers?.data || []} keyExtractor={(s: Supplier) => s.id} loading={isLoading} emptyMessage="No hay proveedores" />
        </>
      )}

      {/* Modals */}
      <PurchaseFormModal
        isOpen={formModalOpen}
        onClose={() => { setFormModalOpen(false); setEditingPurchase(null); }}
        purchase={editingPurchase}
        suppliers={suppliers?.data || []}
        products={products?.data?.data || []}
        onSubmit={receiveMode ? receiveMutation.mutate : createMutation.mutate}
        loading={createMutation.isPending || receiveMutation.isPending}
        mode={receiveMode ? 'receive' : 'create'}
      />

      <SupplierModal
        isOpen={supplierModalOpen}
        onClose={() => { setSupplierModalOpen(false); setEditingSupplier(null); }}
        supplier={editingSupplier}
        onSubmit={editingSupplier ? (data: any) => supplierUpdateMutation.mutate({ id: editingSupplier.id, data }) : supplierCreateMutation.mutate}
        loading={supplierCreateMutation.isPending || supplierUpdateMutation.isPending}
      />
    </div>
  );
}