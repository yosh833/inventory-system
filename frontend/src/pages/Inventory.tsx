import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, Search, Filter, Package, Tag, AlertTriangle, 
  Edit, Trash2, ArrowUpDown, ChevronDown, Save, X,
  Minus, PlusCircle, Settings
} from 'lucide-react';
import { api } from '../api/client';
import { Button } from '../components/ui/Button';
import { Input, Textarea, Select } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Table, Pagination } from '../components/ui/Table';
import { formatCurrency, getStatusBadge, cn } from '../utils/format';
import { Product } from '../types';
import toast from 'react-hot-toast';

function ProductFormModal({ 
  isOpen, onClose, product, categories, onSubmit, loading 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  product: Product | null; 
  categories: any[]; 
  onSubmit: (data: any) => void; 
  loading: boolean 
}) {
  const [formData, setFormData] = useState({
    sku: '', barcode: '', name: '', description: '', categoryId: '',
    costPrice: 0, salePrice: 0, wholesalePrice: '', taxRate: 0.16,
    trackStock: true, minStock: 0, maxStock: '', unit: 'PZA',
    allowDecimal: false, hasVariants: false, variantType: ''
  });

  useEffect(() => {
    if (product) {
      setFormData({
        sku: product.sku, barcode: product.barcode || '', name: product.name,
        description: product.description || '', categoryId: product.categoryId,
        costPrice: product.costPrice, salePrice: product.salePrice,
        wholesalePrice: product.wholesalePrice?.toString() ?? '', taxRate: product.taxRate,
        trackStock: product.trackStock, minStock: product.minStock,
        maxStock: product.maxStock?.toString() ?? '', unit: product.unit,
        allowDecimal: product.allowDecimal, hasVariants: product.hasVariants,
        variantType: product.variantType || ''
      });
    } else {
      setFormData({
        sku: '', barcode: '', name: '', description: '', categoryId: '',
        costPrice: 0, salePrice: 0, wholesalePrice: '', taxRate: 0.16,
        trackStock: true, minStock: 0, maxStock: '', unit: 'PZA',
        allowDecimal: false, hasVariants: false, variantType: ''
      });
    }
  }, [product, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = { ...formData };
    if (!data.wholesalePrice) delete data.wholesalePrice;
    if (!data.maxStock) delete data.maxStock;
    if (!data.barcode) delete data.barcode;
    if (!data.variantType) delete data.variantType;
    onSubmit(data);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={product ? 'Editar Producto' : 'Nuevo Producto'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="SKU *" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} required disabled={!!product} />
          <Input label="Código de barras" value={formData.barcode} onChange={e => setFormData({...formData, barcode: e.target.value})} />
          <Input label="Nombre *" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
          <Select label="Categoría *" value={formData.categoryId} onChange={e => setFormData({...formData, categoryId: e.target.value})} 
            options={categories.map(c => ({ value: c.id, label: c.name }))} required />
          <Input label="Precio costo *" type="number" step="0.01" min="0" value={formData.costPrice} onChange={e => setFormData({...formData, costPrice: parseFloat(e.target.value)})} required />
          <Input label="Precio venta *" type="number" step="0.01" min="0" value={formData.salePrice} onChange={e => setFormData({...formData, salePrice: parseFloat(e.target.value)})} required />
          <Input label="Precio mayoreo" type="number" step="0.01" min="0" value={formData.wholesalePrice} onChange={e => setFormData({...formData, wholesalePrice: e.target.value})} />
          <Input label="IVA" type="number" step="0.001" min="0" max="1" value={formData.taxRate} onChange={e => setFormData({...formData, taxRate: parseFloat(e.target.value)})} />
          <Input label="Unidad" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} />
          <Input label="Stock mínimo" type="number" min="0" value={formData.minStock} onChange={e => setFormData({...formData, minStock: parseInt(e.target.value)})} />
          <Input label="Stock máximo" type="number" min="0" value={formData.maxStock} onChange={e => setFormData({...formData, maxStock: e.target.value})} />
        </div>
        <div className="flex flex-wrap gap-4 pt-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={formData.trackStock} onChange={e => setFormData({...formData, trackStock: e.target.checked})} className="rounded" />
            Controlar stock
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={formData.allowDecimal} onChange={e => setFormData({...formData, allowDecimal: e.target.checked})} className="rounded" />
            Permitir decimales
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={formData.hasVariants} onChange={e => setFormData({...formData, hasVariants: e.target.checked})} className="rounded" />
            Tiene variantes
          </label>
        </div>
        {formData.hasVariants && (
          <Input label="Tipo de variante (ej: COLOR, TALLA)" value={formData.variantType} onChange={e => setFormData({...formData, variantType: e.target.value})} />
        )}
        <Textarea label="Descripción" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows={3} />
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={loading}>{product ? 'Actualizar' : 'Crear'}</Button>
        </div>
      </form>
    </Modal>
  );
}

function AdjustStockModal({ isOpen, onClose, product, onSubmit, loading }: { 
  isOpen: boolean; onClose: () => void; product: Product | null; onSubmit: (qty: number, reason: string) => void; loading: boolean }) {
  const [quantity, setQuantity] = useState(0);
  const [reason, setReason] = useState('');
  const [type, setType] = useState<'in' | 'out'>('in');

  useEffect(() => { if (isOpen) { setQuantity(0); setReason(''); setType('in'); } }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(type === 'in' ? quantity : -quantity, reason);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Ajustar Stock: ${product?.name}`} size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-2">
          <Button type="button" variant={type === 'in' ? 'primary' : 'secondary'} onClick={() => setType('in')} className="flex-1">
            <Plus className="w-4 h-4" /> Entrada
          </Button>
          <Button type="button" variant={type === 'out' ? 'danger' : 'secondary'} onClick={() => setType('out')} className="flex-1">
            <Minus className="w-4 h-4" /> Salida
          </Button>
        </div>
        <Input label="Cantidad *" type="number" min="1" step={product?.allowDecimal ? 0.01 : 1} value={quantity} onChange={e => setQuantity(parseFloat(e.target.value))} required />
        <Input label="Motivo *" value={reason} onChange={e => setReason(e.target.value)} placeholder="Ej: Recepción mercancía, Merma, Devolución..." required />
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant={type === 'out' ? 'danger' : 'primary'} loading={loading}>
            {type === 'in' ? 'Agregar' : 'Restar'} Stock
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function Inventory() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showLowStock, setShowLowStock] = useState(false);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);

  const { data: productsResponse, isLoading } = useQuery({
    queryKey: ['products', 'inventory', page, pageSize, search, categoryFilter, showLowStock, sortBy, sortOrder],
    queryFn: () => api.getProducts({ page, pageSize, search, categoryId: categoryFilter || undefined, lowStock: showLowStock }),
    placeholderData: (prev) => prev
  });

  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: () => api.getCategories() });
  const { data: lowStockData } = useQuery({ queryKey: ['low-stock'], queryFn: () => api.getLowStockReport() });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.createProduct(data),
    onSuccess: () => { toast.success('Producto creado'); setFormModalOpen(false); queryClient.invalidateQueries({ queryKey: ['products'] }); }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.updateProduct(id, data),
    onSuccess: () => { toast.success('Producto actualizado'); setFormModalOpen(false); queryClient.invalidateQueries({ queryKey: ['products'] }); }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteProduct(id),
    onSuccess: () => { toast.success('Producto desactivado'); queryClient.invalidateQueries({ queryKey: ['products'] }); }
  });

  const adjustMutation = useMutation({
    mutationFn: ({ productId, quantity, reason }: { productId: string; quantity: number; reason: string }) => 
      api.adjustStock(productId, quantity, reason),
    onSuccess: () => { toast.success('Stock ajustado'); setAdjustModalOpen(false); queryClient.invalidateQueries({ queryKey: ['products'] }); queryClient.invalidateQueries({ queryKey: ['low-stock'] }); }
  });

  const handleSubmitForm = (data: any) => {
    if (editingProduct) updateMutation.mutate({ id: editingProduct.id, data });
    else createMutation.mutate(data);
  };

  const handleAdjustSubmit = (quantity: number, reason: string) => {
    if (adjustingProduct) adjustMutation.mutate({ productId: adjustingProduct.id, quantity, reason });
  };

  const columns = [
    { key: 'sku', header: 'SKU', className: 'font-mono text-sm' },
    { key: 'barcode', header: 'Código Barras', className: 'font-mono text-sm hidden md:table-cell' },
    { key: 'name', header: 'Producto', render: (p: Product) => (
      <div>
        <p className="font-medium">{p.name}</p>
        <p className="text-xs text-gray-500">{p.categoryName}</p>
      </div>
    )},
    { key: 'salePrice', header: 'P. Venta', render: (p: Product) => formatCurrency(p.salePrice) },
    { key: 'costPrice', header: 'P. Costo', render: (p: Product) => formatCurrency(p.costPrice), className: 'hidden lg:table-cell' },
    { key: 'stock', header: 'Stock', render: (p: Product) => {
      const inv = p.inventory; const avail = (inv?.quantity || 0) - (inv?.reservedQty || 0); const min = p.minStock;
      const isLow = avail <= min && min > 0;
      return (
        <span className={cn('font-mono font-medium', isLow ? 'text-red-600' : 'text-gray-900')}>
          {avail} {p.unit} {isLow && <AlertTriangle className="w-3 h-3 inline ml-1" />}
        </span>
      );
    }},
    { key: 'status', header: 'Estado', render: (p: Product) => {
      const { className, label } = getStatusBadge(p.isActive ? 'ACTIVE' : 'INACTIVE');
      return <span className={className}>{label}</span>;
    }},
    { key: 'actions', header: '', render: (p: Product) => (
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={() => { setEditingProduct(p); setFormModalOpen(true); }} aria-label="Editar"><Edit className="w-4 h-4" /></Button>
        <Button variant="ghost" size="sm" onClick={() => { setAdjustingProduct(p); setAdjustModalOpen(true); }} aria-label="Ajustar stock"><ArrowUpDown className="w-4 h-4" /></Button>
        <Button variant="ghost" size="sm" onClick={() => { if(confirm('¿Desactivar producto?')) deleteMutation.mutate(p.id); }} aria-label="Desactivar" className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></Button>
      </div>
    )}
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="w-6 h-6 text-primary-600" /> Inventario
          </h1>
          <p className="text-gray-500">Gestión de productos y stock</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => { setEditingProduct(null); setFormModalOpen(true); }}>
            <Plus className="w-4 h-4" /> Nuevo Producto
          </Button>
          <Button variant="ghost" onClick={() => {}}><Settings className="w-4 h-4" /> Categorías</Button>
        </div>
      </div>

      {/* Alerts & Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {lowStockData?.data?.alerts?.filter((a: any) => a.status === 'CRITICAL').length > 0 && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-red-500" />
            <div>
              <p className="font-medium text-red-800">{lowStockData.data.alerts.filter((a: any) => a.status === 'CRITICAL').length} productos en stock CRÍTICO</p>
              <p className="text-sm text-red-600">Requieren reposición inmediata</p>
            </div>
          </div>
        )}
        {lowStockData?.data?.alerts?.filter((a: any) => a.status === 'LOW').length > 0 && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-yellow-500" />
            <div>
              <p className="font-medium text-yellow-800">{lowStockData.data.alerts.filter((a: any) => a.status === 'LOW').length} productos con stock BAJO</p>
              <p className="text-sm text-yellow-600">Programar pedido de reposición</p>
            </div>
          </div>
        )}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="font-medium text-blue-800">Total productos</p>
          <p className="text-2xl font-bold text-blue-600">{productsResponse?.data?.total || 0}</p>
        </div>
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="font-medium text-green-800">Activos</p>
          <p className="text-2xl font-bold text-green-600">{productsResponse?.data?.data?.filter((p: Product) => p.isActive).length || 0}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Buscar por nombre, SKU, código..."
            className="input pl-10"
          />
        </div>
        <Select value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setPage(1); }} 
          options={[{ value: '', label: 'Todas' }, ...(categories?.data?.map((c: any) => ({ value: c.id, label: c.name })) || [])]} 
          className="w-auto min-w-[200px]" />
        <Select value={`${sortBy},${sortOrder}`} onChange={e => { const [s, o] = e.target.value.split(','); setSortBy(s); setSortOrder(o as 'asc' | 'desc'); }} 
          options={[
            { value: 'name,asc', label: 'Nombre A-Z' }, { value: 'name,desc', label: 'Nombre Z-A' },
            { value: 'sku,asc', label: 'SKU' }, { value: 'salePrice,desc', label: 'Precio mayor' },
            { value: 'createdAt,desc', label: 'Más recientes' }
          ]} className="w-auto min-w-[160px]" />
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={showLowStock} onChange={e => { setShowLowStock(e.target.checked); setPage(1); }} className="rounded" />
          <Filter className="w-4 h-4" /> Solo stock bajo
        </label>
      </div>

      {/* Table */}
      <Table
        columns={columns}
        data={productsResponse?.data?.data || []}
        keyExtractor={(p: Product) => p.id}
        loading={isLoading}
        emptyMessage="No hay productos registrados"
      />

      {/* Pagination */}
      {productsResponse?.data && (
        <Pagination
          currentPage={productsResponse.data.page}
          totalPages={productsResponse.data.totalPages}
          onPageChange={setPage}
        />
      )}

      {/* Modals */}
      <ProductFormModal
        isOpen={formModalOpen}
        onClose={() => { setFormModalOpen(false); setEditingProduct(null); }}
        product={editingProduct}
        categories={categories?.data || []}
        onSubmit={handleSubmitForm}
        loading={createMutation.isPending || updateMutation.isPending}
      />

      <AdjustStockModal
        isOpen={adjustModalOpen}
        onClose={() => { setAdjustModalOpen(false); setAdjustingProduct(null); }}
        product={adjustingProduct}
        onSubmit={handleAdjustSubmit}
        loading={adjustMutation.isPending}
      />
    </div>
  );
}