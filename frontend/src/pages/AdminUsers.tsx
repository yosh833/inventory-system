import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, Search, User, UserPlus, UserMinus, Shield, 
  Edit, Eye, X, Save, Mail, Lock, RefreshCw, Trash2,
  ChevronDown
} from 'lucide-react';
import { api } from '../api/client';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Table, Pagination } from '../components/ui/Table';
import { formatDate, getRoleBadge, cn } from '../utils/format';
import { useAuth } from '../hooks/useAuth';
import { Role } from '../types';
import toast from 'react-hot-toast';

function UserFormModal({ isOpen, onClose, user, onSubmit, loading, isEditingSelf }: { 
  isOpen: boolean; onClose: () => void; user: any | null; onSubmit: (data: any) => void; loading: boolean; isEditingSelf: boolean }) {
  const [formData, setFormData] = useState({
    email: '', password: '', fullName: '', role: Role.OPERATOR, isActive: true
  });
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (user) setFormData({ email: user.email, password: '', fullName: user.fullName, role: user.role, isActive: user.isActive });
    else setFormData({ email: '', password: '', fullName: '', role: Role.OPERATOR, isActive: true });
  }, [user, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = { ...formData };
    if (!data.password) delete data.password;
    onSubmit(data);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={user ? 'Editar Usuario' : 'Nuevo Usuario'} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Email *" type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required disabled={!!user} />
        <Input label={user ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña *'} 
          type={showPassword ? 'text' : 'password'} 
          value={formData.password} 
          onChange={e => setFormData({...formData, password: e.target.value})} 
          required={!user}
          endAdornment={<button type="button" onClick={() => setShowPassword(!showPassword)} className="text-gray-400">{showPassword ? <Eye className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</button>} />
        <Input label="Nombre completo *" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} required />
        {!isEditingSelf && (
          <Select label="Rol" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as Role})} 
            options={Object.values(Role).map(r => ({ value: r, label: r }))} />
        )}
        {!isEditingSelf && (
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} className="rounded" />
            Activo
          </label>
        )}
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={loading}>{user ? 'Actualizar' : 'Crear'}</Button>
        </div>
      </form>
    </Modal>
  );
}

function PasswordModal({ isOpen, onClose, onSubmit, loading }: { 
  isOpen: boolean; onClose: () => void; onSubmit: (current: string, newPass: string) => void; loading: boolean }) {
  const [current, setCurrent] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass !== confirm) { toast.error('Las contraseñas no coinciden'); return; }
    if (newPass.length < 6) { toast.error('Mínimo 6 caracteres'); return; }
    onSubmit(current, newPass);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cambiar Contraseña" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Contraseña actual" type={showCurrent ? 'text' : 'password'} value={current} onChange={e => setCurrent(e.target.value)} required endAdornment={<button type="button" onClick={() => setShowCurrent(!showCurrent)}><Eye className="w-5 h-5" /></button>} />
        <Input label="Nueva contraseña" type={showNew ? 'text' : 'password'} value={newPass} onChange={e => setNewPass(e.target.value)} required minLength={6} endAdornment={<button type="button" onClick={() => setShowNew(!showNew)}><Eye className="w-5 h-5" /></button>} />
        <Input label="Confirmar nueva" type={showNew ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)} required />
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={loading}>Cambiar</Button>
        </div>
      </form>
    </Modal>
  );
}

export function AdminUsers() {
  const queryClient = useQueryClient();
  const { data: currentUser } = useQuery({ queryKey: ['auth-me'], queryFn: () => api.getProfile() });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [passwordUserId, setPasswordUserId] = useState('');

  const { data: usersResponse, isLoading } = useQuery({
    queryKey: ['users', page, pageSize, search, roleFilter, statusFilter],
    queryFn: () => api.getUsers({ page, pageSize, search, role: roleFilter || undefined, isActive: statusFilter === 'true' ? true : statusFilter === 'false' ? false : undefined }),
    placeholderData: (prev) => prev
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.createUser(data),
    onSuccess: () => { toast.success('Usuario creado'); setFormModalOpen(false); queryClient.invalidateQueries({ queryKey: ['users'] }); }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.updateUser(id, data),
    onSuccess: () => { toast.success('Usuario actualizado'); setFormModalOpen(false); queryClient.invalidateQueries({ queryKey: ['users'] }); }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteUser(id),
    onSuccess: () => { toast.success('Usuario desactivado'); queryClient.invalidateQueries({ queryKey: ['users'] }); }
  });

  const passwordMutation = useMutation({
    mutationFn: ({ current, newPass }: { current: string; newPass: string }) => api.changePassword(current, newPass),
    onSuccess: () => { toast.success('Contraseña cambiada'); setPasswordModalOpen(false); },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Error')
  });

  const columns = [
    { key: 'email', header: 'Email' },
    { key: 'fullName', header: 'Nombre' },
    { key: 'role', header: 'Rol', render: (u: any) => <span className={getRoleBadge(u.role).className}>{getRoleBadge(u.role).label}</span> },
    { key: 'status', header: 'Estado', render: (u: any) => {
      const { className, label } = u.isActive ? { className: 'badge-success', label: 'Activo' } : { className: 'badge-gray', label: 'Inactivo' };
      return <span className={className}>{label}</span>;
    }},
    { key: 'lastLoginAt', header: 'Último acceso', render: (u: any) => u.lastLoginAt ? formatDate(u.lastLoginAt) : 'Nunca', className: 'hidden md:table-cell' },
    { key: 'actions', header: '', render: (u: any) => (
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={() => { setEditingUser(u); setFormModalOpen(true); }} aria-label="Editar"><Edit className="w-4 h-4" /></Button>
        <Button variant="ghost" size="sm" onClick={() => { setPasswordUserId(u.id); setPasswordModalOpen(true); }} aria-label="Cambiar contraseña"><Lock className="w-4 h-4" /></Button>
        {u.id !== currentUser?.data?.userId && (
          <Button variant="ghost" size="sm" onClick={() => { if(confirm(`${u.isActive ? 'Desactivar' : 'Activar'} usuario?`)) deleteMutation.mutate(u.id); }} aria-label={u.isActive ? 'Desactivar' : 'Activar'} className={u.isActive ? 'text-red-500' : 'text-green-500'}>
            {u.isActive ? <UserMinus className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
          </Button>
        )}
      </div>
    )}
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary-600" /> Gestión de Usuarios
          </h1>
          <p className="text-gray-500">Administradores y operadores del sistema</p>
        </div>
        <Button variant="secondary" onClick={() => { setEditingUser(null); setFormModalOpen(true); }}>
          <Plus className="w-4 h-4" /> Nuevo Usuario
        </Button>
      </div>

      <div className="card p-4 flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Buscar nombre, email..." className="input pl-10" />
        </div>
        <Select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }} 
          options={[{ value: '', label: 'Todos' }, ...Object.values(Role).map(r => ({ value: r, label: r }))]} className="w-auto min-w-[160px]" />
        <Select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} 
          options={[{ value: '', label: 'Todos' }, { value: 'true', label: 'Activos' }, { value: 'false', label: 'Inactivos' }]} className="w-auto min-w-[160px]" />
      </div>

      <Table columns={columns} data={usersResponse?.data || []} keyExtractor={(u: any) => u.id} loading={isLoading} emptyMessage="No hay usuarios" />
      {usersResponse && <Pagination currentPage={usersResponse.pagination.page} totalPages={usersResponse.pagination.totalPages} onPageChange={setPage} />}

      <UserFormModal isOpen={formModalOpen} onClose={() => { setFormModalOpen(false); setEditingUser(null); }} user={editingUser} onSubmit={editingUser ? (d: any) => updateMutation.mutate({ id: editingUser.id, data: d }) : createMutation.mutate} loading={createMutation.isPending || updateMutation.isPending} isEditingSelf={editingUser?.id === currentUser?.userId} />
      <PasswordModal isOpen={passwordModalOpen} onClose={() => { setPasswordModalOpen(false); setPasswordUserId(''); }} onSubmit={(current, newPass) => passwordMutation.mutate({ current, newPass })} loading={passwordMutation.isPending} />
    </div>
  );
}