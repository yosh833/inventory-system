import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Eye, EyeOff, Camera, Save, X, Check, Lock, User, Mail, Trash2 } from 'lucide-react';
import { api } from '../api/client';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Card } from '../components/ui/Card';
import { formatCurrency, cn } from '../utils/format';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

export function Profile() {
  const { user, refreshUser } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');
  const [saving, setSaving] = useState(false);

  const [profileData, setProfileData] = useState({
    fullName: '', email: '', avatarUrl: ''
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '', newPassword: '', confirmPassword: ''
  });

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileData({
        fullName: user.fullName,
        email: user.email,
        avatarUrl: user.avatarUrl || ''
      });
    }
  }, [user]);

  const updateProfileMutation = useMutation({
    mutationFn: (data: any) => api.updateProfile(data),
    onSuccess: (response) => {
      toast.success('Perfil actualizado');
      setSaving(false);
      refreshUser();
      queryClient.invalidateQueries({ queryKey: ['auth-me'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Error al actualizar');
      setSaving(false);
    }
  });

  const changePasswordMutation = useMutation({
    mutationFn: ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) => api.changePassword(currentPassword, newPassword),
    onSuccess: () => {
      toast.success('Contraseña cambiada');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setSaving(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Error al cambiar contraseña');
      setSaving(false);
    }
  });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    updateProfileMutation.mutate(profileData);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      toast.error('Mínimo 6 caracteres');
      return;
    }
    setSaving(true);
    changePasswordMutation.mutate({ currentPassword: passwordData.currentPassword, newPassword: passwordData.newPassword });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <User className="w-6 h-6 text-primary-600" /> Mi Perfil
        </h1>
        <p className="text-gray-500">Información personal y seguridad</p>
      </div>

      {/* Avatar & Basic Info */}
      <Card className="p-6">
        <div className="flex items-center gap-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-primary-100 flex items-center justify-center overflow-hidden">
              {profileData.avatarUrl ? (
                <img src={profileData.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User className="w-12 h-12 text-primary-600" />
              )}
            </div>
            <label className="absolute bottom-0 right-0 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center cursor-pointer hover:bg-primary-700 transition-colors">
              <Camera className="w-4 h-4" />
              <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleAvatarChange} />
            </label>
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900">{profileData.fullName || 'Sin nombre'}</h2>
            <p className="text-gray-500">{profileData.email}</p>
            <p className="text-sm text-gray-400 mt-1">Rol: <span className="capitalize">{user?.role?.toLowerCase()}</span></p>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1" role="tablist">
          {[
            { id: 'profile', label: 'Perfil', icon: User },
            { id: 'security', label: 'Seguridad', icon: Lock }
          ].map(tab => (
            <button key={tab.id} role="tab" aria-selected={activeTab === tab.id} onClick={() => setActiveTab(tab.id as any)}
              className={cn('flex items-center gap-1 px-4 py-2 text-sm font-medium border-b-2 transition-colors', activeTab === tab.id ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700')}>
              <tab.icon className="w-4 h-4" /> {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'profile' && (
        <Card className="p-6">
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <h3 className="text-lg font-semibold mb-4">Información Personal</h3>
            <Input label="Nombre completo *" value={profileData.fullName} onChange={e => setProfileData({...profileData, fullName: e.target.value})} required />
            <Input label="Email *" type="email" value={profileData.email} onChange={e => setProfileData({...profileData, email: e.target.value})} required disabled />
            <Input label="URL Avatar (opcional)" value={profileData.avatarUrl} onChange={e => setProfileData({...profileData, avatarUrl: e.target.value})} placeholder="https://..." />
            <div className="flex justify-end pt-4">
              <Button type="submit" loading={saving}><Save className="w-4 h-4" /> Guardar Cambios</Button>
            </div>
          </form>
        </Card>
      )}

      {activeTab === 'security' && (
        <Card className="p-6">
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <h3 className="text-lg font-semibold mb-4">Cambiar Contraseña</h3>
            <Input label="Contraseña actual *" type={showCurrent ? 'text' : 'password'} value={passwordData.currentPassword} onChange={e => setPasswordData({...passwordData, currentPassword: e.target.value})} required endAdornment={<button type="button" onClick={() => setShowCurrent(!showCurrent)}><Eye className="w-5 h-5" /></button>} />
            <Input label="Nueva contraseña *" type={showNew ? 'text' : 'password'} value={passwordData.newPassword} onChange={e => setPasswordData({...passwordData, newPassword: e.target.value})} required minLength={6} endAdornment={<button type="button" onClick={() => setShowNew(!showNew)}><Eye className="w-5 h-5" /></button>} />
            <Input label="Confirmar nueva contraseña *" type={showConfirm ? 'text' : 'password'} value={passwordData.confirmPassword} onChange={e => setPasswordData({...passwordData, confirmPassword: e.target.value})} required endAdornment={<button type="button" onClick={() => setShowConfirm(!showConfirm)}><Eye className="w-5 h-5" /></button>} />
            <div className="flex justify-end pt-4">
              <Button type="submit" loading={saving}><Lock className="w-4 h-4" /> Cambiar Contraseña</Button>
            </div>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-100">
            <h3 className="text-lg font-semibold mb-3">Sesiones Activas</h3>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Esta es tu única sesión activa actualmente.</p>
              <p className="text-sm text-gray-500 mt-1">Al cambiar tu contraseña, se cerrarán todas las sesiones.</p>
            </div>
          </div>
        </Card>
      )}

      {/* Danger Zone */}
      <Card className="p-6 border-red-200">
        <h3 className="text-lg font-semibold text-red-700 mb-3 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" /> Zona de Peligro
        </h3>
        <p className="text-sm text-gray-600 mb-4">Estas acciones son irreversibles.</p>
        <Button variant="danger" onClick={() => { if(confirm('¿Eliminar mi cuenta? Esta acción no se puede deshacer.')) { /* delete */ } }}>
          <Trash2 className="w-4 h-4" /> Eliminar Mi Cuenta
        </Button>
      </Card>
    </div>
  );

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setProfileData(prev => ({ ...prev, avatarUrl: event.target?.result as string }));
      };
      reader.readAsDataURL(file);
    }
  }
}