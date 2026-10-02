import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, Search, User, CreditCard, DollarSign, AlertTriangle, 
  Edit, Eye, X, Save, Mail, Phone, MapPin, Calendar, 
  ArrowLeft, RefreshCw
} from 'lucide-react';
import { api } from '../api/client';
import { Button } from '../components/ui/Button';
import { Input, Textarea, Select } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Table, Pagination } from '../components/ui/Table';
import { formatCurrency, formatDate, getStatusBadge, cn } from '../utils/format';
import { Client } from '../types';
import toast from 'react-hot-toast';

function ClientFormModal({ isOpen, onClose, client, onSubmit, loading }: { 
  isOpen: boolean; onClose: () => void; client: Client | null; onSubmit: (data: any) => void; loading: boolean }) {
  const [formData, setFormData] = useState({
    fullName: '', email: '', phone: '', address: '', taxId: '', creditLimit: 0, notes: ''
  });

  useEffect(() => {
    if (client) setFormData({ fullName: client.fullName, email: client.email || '', phone: client.phone || '', address: client.address || '', taxId: client.taxId || '', creditLimit: client.creditLimit, notes: client.notes || '' });
    else setFormData({ fullName: '', email: '', phone: '', address: '', taxId: '', creditLimit: 0, notes: '' });
  }, [client, isOpen]);

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSubmit(formData); };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={client ? 'Editar Cliente' : 'Nuevo Cliente'} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Nombre completo *" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} required />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Email" type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
          <Input label="Teléfono" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
        </div>
        <Input label="RFC" value={formData.taxId} onChange={e => setFormData({...formData, taxId: e.target.value})} />
        <Input label="Límite de crédito" type="number" min="0" step="0.01" value={formData.creditLimit} onChange={e => setFormData({...formData, creditLimit: parseFloat(e.target.value)})} />
        <Textarea label="Dirección" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} rows={2} />
        <Textarea label="Notas" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} rows={2} />
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={loading}>{client ? 'Actualizar' : 'Crear'}</Button>
        </div>
      </form>
    </Modal>
  );
}

function PaymentModal({ isOpen, onClose, client, onSubmit, loading }: { 
  isOpen: boolean; onClose: () => void; client: Client; onSubmit: (data: any) => void; loading: boolean }) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('CASH');
  const [reference, setReference] = useState('');

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSubmit({ amount: parseFloat(amount), method, reference }); };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Registrar Pago: ${client.fullName}`} size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-500">Saldo pendiente</p>
          <p className="text-2xl font-bold text-red-600">{formatCurrency(client.currentBalance)}</p>
          <p className="text-sm text-gray-500">Límite: {formatCurrency(client.creditLimit)} | Disponible: {formatCurrency(client.creditLimit - client.currentBalance)}</p>
        </div>
        <Input label="Monto *" type="number" step="0.01" min="0.01" max={client.currentBalance} value={amount} onChange={e => setAmount(e.target.value)} required />
        <Select label="Método" value={method} onChange={e => setMethod(e.target.value)} options={[
          { value: 'CASH', label: 'Efectivo' }, { value: 'CARD', label: 'Tarjeta' }, { value: 'TRANSFER', label: 'Transferencia' }, { value: 'CHECK', label: 'Cheque' }
        ]} />
        <Input label="Referencia (opcional)" value={reference} onChange={e => setReference(e.target.value)} placeholder="Folio transferencia, auth code..." />
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={loading}>Registrar Pago</Button>
        </div>
      </form>
    </Modal>
  );
}

function ClientDetailModal({ isOpen, onClose, clientId, queryClient }: { 
  isOpen: boolean; onClose: () => void; clientId: string; queryClient: any }) {
  const { data, isLoading } = useQuery({ queryKey: ['client-balance', clientId], queryFn: () => api.getClientBalance(clientId), enabled: isOpen });

  const [showPayment, setShowPayment] = useState(false);

  const clientData = data?.data?.client;

  return (
    <Modal isOpen={isOpen} onClose={() => { onClose(); setShowPayment(false); }} title="Detalle del Cliente" size="lg">
      {isLoading ? (
        <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>
      ) : clientData && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg"><p className="text-sm text-gray-500">Saldo actual</p><p className="text-2xl font-bold text-red-600">{formatCurrency(clientData.currentBalance)}</p></div>
            <div className="p-4 bg-gray-50 rounded-lg"><p className="text-sm text-gray-500">Límite crédito</p><p className="text-2xl font-bold">{formatCurrency(clientData.creditLimit)}</p></div>
            <div className="p-4 bg-gray-50 rounded-lg"><p className="text-sm text-gray-500">Disponible</p><p className="text-2xl font-bold text-green-600">{formatCurrency(clientData.creditLimit - clientData.currentBalance)}</p></div>
            <div className="p-4 bg-gray-50 rounded-lg"><p className="text-sm text-gray-500">Código</p><p className="font-mono font-bold">{clientData.code}</p></div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><p className="text-gray-500">Email</p><p>{clientData.email || '-'}</p></div>
            <div><p className="text-gray-500">Teléfono</p><p>{clientData.phone || '-'}</p></div>
            <div><p className="text-gray-500">RFC</p><p>{clientData.taxId || '-'}</p></div>
            <div><p className="text-gray-500">Estado</p><p><span className={getStatusBadge(clientData.isActive ? 'ACTIVE' : 'INACTIVE').className}>{clientData.isActive ? 'Activo' : 'Inactivo'}</span></p></div>
          </div>

          <div className="flex justify-end">
            <Button onClick={() => setShowPayment(true)} disabled={clientData.currentBalance <= 0}>
              <CreditCard className="w-4 h-4" /> Registrar Pago
            </Button>
          </div>

          <div className="border-t pt-4">
            <h3 className="font-medium mb-3">Últimas ventas</h3>
            <Table
              columns={[
                { key: 'folio', header: 'Folio', className: 'font-mono' },
                { key: 'date', header: 'Fecha', render: (s: any) => formatDate(s.date) },
                { key: 'total', header: 'Total', render: (s: any) => formatCurrency(s.total) },
                { key: 'status', header: 'Estado', render: (s: any) => <span className={getStatusBadge(s.status).className}>{getStatusBadge(s.status).label}</span> }
              ]}
              data={data.data.recentSales}
              keyExtractor={(s: any) => s.id}
              emptyMessage="Sin ventas recientes"
            />
          </div>
        </div>
      )}
    </Modal>
  );
}

export function Clients() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [paymentClient, setPaymentClient] = useState<Client | null>(null);

  const { data: clientsResponse, isLoading } = useQuery({
    queryKey: ['clients', page, pageSize, search, statusFilter],
    queryFn: () => api.getClients({ page, pageSize, search, isActive: statusFilter === 'true' ? true : statusFilter === 'false' ? false : undefined }),
    placeholderData: (prev) => prev
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.createClient(data),
    onSuccess: () => { toast.success('Cliente creado'); setFormModalOpen(false); queryClient.invalidateQueries({ queryKey: ['clients'] }); }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.updateClient(id, data),
    onSuccess: () => { toast.success('Cliente actualizado'); setFormModalOpen(false); queryClient.invalidateQueries({ queryKey: ['clients'] }); }
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => api.toggleClientStatus(id),
    onSuccess: () => { toast.success('Estado actualizado'); queryClient.invalidateQueries({ queryKey: ['clients'] }); }
  });

  const paymentMutation = useMutation({
    mutationFn: (data: { amount: number; method: string; reference: string }) => api.makeClientPayment(paymentClient!.id, data.amount, data.method, data.reference),
    onSuccess: () => { toast.success('Pago registrado'); queryClient.invalidateQueries({ queryKey: ['client-balance', paymentClient?.id] }); queryClient.invalidateQueries({ queryKey: ['clients'] }); queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] }); }
  });

  const columns = [
    { key: 'code', header: 'Código', className: 'font-mono' },
    { key: 'fullName', header: 'Nombre', render: (c: Client) => (
      <div>
        <p className="font-medium">{c.fullName}</p>
        <p className="text-xs text-gray-500">{c.email || 'Sin email'}</p>
      </div>
    )},
    { key: 'phone', header: 'Teléfono', className: 'hidden md:table-cell' },
    { key: 'balance', header: 'Saldo', render: (c: Client) => (
      <span className={cn('font-mono font-medium', c.currentBalance > 0 ? 'text-red-600' : 'text-gray-900')}>
        {formatCurrency(c.currentBalance)}
      </span>
    )},
    { key: 'creditLimit', header: 'Límite', render: (c: Client) => formatCurrency(c.creditLimit) },
    { key: 'available', header: 'Disponible', render: (c: Client) => {
      const avail = c.creditLimit - c.currentBalance;
      return <span className={cn('font-mono font-medium', avail < 0 ? 'text-red-600' : 'text-green-600')}>{formatCurrency(avail)}</span>;
    }},
    { key: 'status', header: 'Estado', render: (c: Client) => {
      const { className, label } = getStatusBadge(c.isActive ? 'ACTIVE' : 'INACTIVE');
      return <span className={className}>{label}</span>;
    }},
    { key: 'actions', header: '', render: (c: Client) => (
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={() => { setEditingClient(c); setFormModalOpen(true); }} aria-label="Editar"><Edit className="w-4 h-4" /></Button>
        <Button variant="ghost" size="sm" onClick={() => { queryClient.invalidateQueries({ queryKey: ['client-balance', c.id] }); setDetailModalOpen(true); }} aria-label="Ver detalle"><Eye className="w-4 h-4" /></Button>
        <Button variant="ghost" size="sm" onClick={() => { setPaymentClient(c); setPaymentModalOpen(true); }} disabled={c.currentBalance <= 0} aria-label="Registrar pago" className="text-green-600"><CreditCard className="w-4 h-4" /></Button>
        <Button variant="ghost" size="sm" onClick={() => { if(confirm(`${c.isActive ? 'Desactivar' : 'Activar'} cliente?`)) toggleMutation.mutate(c.id); }} aria-label={c.isActive ? 'Desactivar' : 'Activar'}>
          {c.isActive ? <X className="w-4 h-4" /> : <RefreshCw className="w-4 h-4" />}
        </Button>
      </div>
    )}
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <User className="w-6 h-6 text-primary-600" /> Clientes
          </h1>
          <p className="text-gray-500">Gestión de clientes y cuentas por cobrar</p>
        </div>
        <Button variant="secondary" onClick={() => { setEditingClient(null); setFormModalOpen(true); }}>
          <Plus className="w-4 h-4" /> Nuevo Cliente
        </Button>
      </div>

      <div className="card p-4 flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Buscar nombre, código, email, teléfono..." className="input pl-10" />
        </div>
        <Select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} 
          options={[{ value: '', label: 'Todos' }, { value: 'true', label: 'Activos' }, { value: 'false', label: 'Inactivos' }]} className="w-auto min-w-[160px]" />
      </div>

      <Table columns={columns} data={clientsResponse?.data?.data || []} keyExtractor={(c: Client) => c.id} loading={isLoading} emptyMessage="No hay clientes registrados" />
      {clientsResponse?.data && <Pagination currentPage={clientsResponse.data.page} totalPages={clientsResponse.data.totalPages} onPageChange={setPage} />}

      <ClientFormModal isOpen={formModalOpen} onClose={() => { setFormModalOpen(false); setEditingClient(null); }} client={editingClient} onSubmit={editingClient ? (d: any) => updateMutation.mutate({ id: editingClient.id, data: d }) : createMutation.mutate} loading={createMutation.isPending || updateMutation.isPending} />
      
      <ClientDetailModal isOpen={detailModalOpen} onClose={() => setDetailModalOpen(false)} clientId={editingClient?.id || ''} queryClient={queryClient} />
      
      <PaymentModal isOpen={paymentModalOpen} onClose={() => { setPaymentModalOpen(false); setPaymentClient(null); }} client={paymentClient!} onSubmit={paymentMutation.mutate} loading={paymentMutation.isPending} />
    </div>
  );
}