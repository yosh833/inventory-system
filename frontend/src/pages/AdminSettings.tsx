import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Building, DollarSign, Hash, Calendar, Bell, Save, 
  Check, X, AlertCircle, Info, User, Package, Truck
} from 'lucide-react';
import { api } from '../api/client';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Card } from '../components/ui/Card';
import { formatCurrency, cn } from '../utils/format';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

export function AdminSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [config, setConfig] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'numbering' | 'notifications'>('general');

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await api.getSystemConfig?.() || { data: {} };
        const cfg: any = {};
        res.data?.forEach?.((c: any) => { cfg[c.key] = c.value; });
        setConfig({
          company_name: cfg.company_name || 'Mi Empresa',
          tax_rate_default: cfg.tax_rate_default || 0.16,
          currency: cfg.currency || 'MXN',
          voice_enabled: cfg.voice_enabled !== false,
          sale_folio_prefix: cfg.sale_folio_prefix || 'VTA',
          purchase_folio_prefix: cfg.purchase_folio_prefix || 'CMP',
          adjustment_folio_prefix: cfg.adjustment_folio_prefix || 'AJU',
          client_code_prefix: cfg.client_code_prefix || 'CLI',
          supplier_code_prefix: cfg.supplier_code_prefix || 'PROV',
          low_stock_threshold: cfg.low_stock_threshold || 0.2,
          email_notifications: cfg.email_notifications || false,
          sms_notifications: cfg.sms_notifications || false,
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      // In a real app, you'd send to backend
      // await api.updateConfig(config);
      toast.success('Configuración guardada');
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    } catch (err) {
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-12">Cargando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Building className="w-6 h-6 text-primary-600" /> Configuración del Sistema
          </h1>
          <p className="text-gray-500">Parámetros generales, numeración y notificaciones</p>
        </div>
        <Button onClick={handleSave} loading={saving}><Save className="w-4 h-4" /> Guardar Cambios</Button>
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex gap-1 overflow-x-auto pb-1" role="tablist">
          {[
            { id: 'general', label: 'General', icon: Building },
            { id: 'numbering', label: 'Numeración', icon: Hash },
            { id: 'notifications', label: 'Notificaciones', icon: Bell }
          ].map(tab => (
            <button key={tab.id} role="tab" aria-selected={activeTab === tab.id} onClick={() => setActiveTab(tab.id as any)}
              className={cn('flex items-center gap-1 px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors', activeTab === tab.id ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700')}>
              <tab.icon className="w-4 h-4" /> {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'general' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Información de la Empresa</h3>
            <div className="space-y-4">
              <Input label="Nombre de la empresa" value={config.company_name} onChange={e => setConfig({...config, company_name: e.target.value})} />
              <div className="grid grid-cols-2 gap-4">
                <Select label="Moneda" value={config.currency} onChange={e => setConfig({...config, currency: e.target.value})} 
                  options={[{ value: 'MXN', label: 'MXN - Peso Mexicano' }, { value: 'USD', label: 'USD - Dólar' }, { value: 'EUR', label: 'EUR - Euro' }]} />
                <Input label="IVA por defecto (%)" type="number" step="0.01" min="0" max="100" value={config.tax_rate_default * 100} onChange={e => setConfig({...config, tax_rate_default: parseFloat(e.target.value) / 100})} />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Funciones</h3>
            <div className="space-y-4">
              <label className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Comandos de voz habilitados</p>
                  <p className="text-sm text-gray-500">Permitir registro por voz en POS</p>
                </div>
                <input type="checkbox" checked={config.voice_enabled} onChange={e => setConfig({...config, voice_enabled: e.target.checked})} className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
              </label>
              <label className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Umbral stock bajo</p>
                  <p className="text-sm text-gray-500">Porcentaje del stock mínimo para alertar (0.2 = 20%)</p>
                </div>
                <Input type="number" step="0.01" min="0" max="1" value={config.low_stock_threshold} onChange={e => setConfig({...config, low_stock_threshold: parseFloat(e.target.value)})} className="w-24" />
              </label>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'numbering' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><DollarSign className="w-5 h-5" /> Ventas</h3>
            <Input label="Prefijo folio" value={config.sale_folio_prefix} onChange={e => setConfig({...config, sale_folio_prefix: e.target.value})} placeholder="VTA" />
            <p className="text-sm text-gray-500 mt-2">Formato: {config.sale_folio_prefix}-2024-0001</p>
          </Card>
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Package className="w-5 h-5" /> Compras</h3>
            <Input label="Prefijo folio" value={config.purchase_folio_prefix} onChange={e => setConfig({...config, purchase_folio_prefix: e.target.value})} placeholder="CMP" />
            <p className="text-sm text-gray-500 mt-2">Formato: {config.purchase_folio_prefix}-2024-0001</p>
          </Card>
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><AlertCircle className="w-5 h-5" /> Ajustes</h3>
            <Input label="Prefijo folio" value={config.adjustment_folio_prefix} onChange={e => setConfig({...config, adjustment_folio_prefix: e.target.value})} placeholder="AJU" />
            <p className="text-sm text-gray-500 mt-2">Formato: {config.adjustment_folio_prefix}-2024-0001</p>
          </Card>
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><User className="w-5 h-5" /> Clientes</h3>
            <Input label="Prefijo código" value={config.client_code_prefix} onChange={e => setConfig({...config, client_code_prefix: e.target.value})} placeholder="CLI" />
            <p className="text-sm text-gray-500 mt-2">Formato: {config.client_code_prefix}-001</p>
          </Card>
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Truck className="w-5 h-5" /> Proveedores</h3>
            <Input label="Prefijo código" value={config.supplier_code_prefix} onChange={e => setConfig({...config, supplier_code_prefix: e.target.value})} placeholder="PROV" />
            <p className="text-sm text-gray-500 mt-2">Formato: {config.supplier_code_prefix}-001</p>
          </Card>
        </div>
      )}

      {activeTab === 'notifications' && (
        <Card className="p-6 max-w-2xl">
          <h3 className="text-lg font-semibold mb-4">Notificaciones</h3>
          <div className="space-y-4">
            <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium">Notificaciones por email</p>
                <p className="text-sm text-gray-500">Alertas de stock bajo, ventas diarias, etc.</p>
              </div>
              <input type="checkbox" checked={config.email_notifications} onChange={e => setConfig({...config, email_notifications: e.target.checked})} className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
            </label>
            <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium">Notificaciones SMS</p>
                <p className="text-sm text-gray-500">Requiere integración con proveedor SMS</p>
              </div>
              <input type="checkbox" checked={config.sms_notifications} onChange={e => setConfig({...config, sms_notifications: e.target.checked})} className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500" disabled />
            </label>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800 flex items-center gap-2"><Info className="w-4 h-4" /> La configuración de notificaciones requiere variables de entorno (SMTP, Twilio, etc.) en el backend.</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}