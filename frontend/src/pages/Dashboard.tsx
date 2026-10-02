import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { Card } from '../components/ui/Card';
import { formatCurrency, formatRelativeTime, cn } from '../utils/format';
import { 
  ShoppingCart, Package, Users, TrendingUp, ArrowUpRight, ArrowDownRight, 
  AlertTriangle, Clock, DollarSign, ShoppingBag
} from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: React.ReactNode;
  color: string;
}

function StatCard({ title, value, change, changeType = 'neutral', icon, color }: StatCardProps) {
  const trendColor = changeType === 'positive' ? 'text-green-600' : changeType === 'negative' ? 'text-red-600' : 'text-gray-500';
  const trendIcon = changeType === 'positive' ? <ArrowUpRight className="w-4 h-4" /> : changeType === 'negative' ? <ArrowDownRight className="w-4 h-4" /> : null;

  return (
    <div className="card p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
          {change && (
            <p className="mt-2 flex items-center gap-1 text-sm">
              <span className={trendColor}>
                {trendIcon}
                {change}
              </span>
              <span className="text-gray-500">vs periodo anterior</span>
            </p>
          )}
        </div>
        <div className={cn('p-3 rounded-xl', color)}>
          {icon}
        </div>
      </div>
    </div>
  );
}

export function Dashboard() {
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.getDashboardStats(),
    refetchInterval: 30000
  });

  const { data: lowStock } = useQuery({
    queryKey: ['low-stock'],
    queryFn: () => api.getLowStockReport(),
    refetchInterval: 60000
  });

  if (!stats?.data) return null;

  const d = stats.data;
  const criticalCount = lowStock?.data?.alerts?.filter((a: any) => a.status === 'CRITICAL').length || 0;
  const lowCount = lowStock?.data?.alerts?.filter((a: any) => a.status === 'LOW').length || 0;

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Ventas de hoy"
          value={formatCurrency(d.today.totalAmount)}
          change={`${d.today.salesCount} transacciones`}
          changeType="positive"
          icon={<ShoppingCart className="w-6 h-6" />}
          color="bg-primary-100 text-primary-600"
        />
        <StatCard
          title="Ticket promedio"
          value={formatCurrency(d.today.avgTicket)}
          change="vs ayer"
          changeType="neutral"
          icon={<DollarSign className="w-6 h-6" />}
          color="bg-green-100 text-green-600"
        />
        <StatCard
          title="Productos activos"
          value={d.inventory.activeProducts}
          change={criticalCount > 0 ? `${criticalCount} críticos` : 'Todos OK'}
          changeType={criticalCount > 0 ? 'negative' : 'positive'}
          icon={<Package className="w-6 h-6" />}
          color="bg-blue-100 text-blue-600"
        />
        <StatCard
          title="Clientes activos"
          value={d.clients.active}
          change={`${d.purchases.pending} compras pendientes`}
          changeType="neutral"
          icon={<Users className="w-6 h-6" />}
          color="bg-purple-100 text-purple-600"
        />
      </div>

      {/* Alerts & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Stock Alerts */}
        <div className="lg:col-span-2 card">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              Alertas de Stock
            </h2>
            <a href="/inventory?lowStock=true" className="text-sm text-primary-600 hover:underline">Ver todo</a>
          </div>
          <div className="divide-y divide-gray-100">
            {criticalCount > 0 && (
              <div className="p-4 bg-red-50 border-l-4 border-red-500">
                <div className="flex items-center gap-2 text-red-700 mb-2">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="font-medium">{criticalCount} productos en stock CRÍTICO</span>
                </div>
                <p className="text-sm text-red-600">Requieren reposición inmediata</p>
              </div>
            )}
            {lowCount > 0 && (
              <div className="p-4 bg-yellow-50 border-l-4 border-yellow-500">
                <div className="flex items-center gap-2 text-yellow-700 mb-2">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="font-medium">{lowCount} productos con stock BAJO</span>
                </div>
                <p className="text-sm text-yellow-600">Programar pedido de reposición</p>
              </div>
            )}
            {criticalCount === 0 && lowCount === 0 && (
              <div className="p-8 text-center text-gray-500">
                <Package className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                <p>Todos los productos tienen stock adecuado</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Acciones rápidas</h3>
          <div className="space-y-2">
            <a href="/pos" className="flex items-center gap-3 p-3 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors">
              <ShoppingCart className="w-5 h-5 text-primary-600" />
              <span className="font-medium text-primary-700">Nueva venta</span>
            </a>
            <a href="/purchases/new" className="flex items-center gap-3 p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
              <ShoppingBag className="w-5 h-5 text-green-600" />
              <span className="font-medium text-green-700">Nueva compra</span>
            </a>
            <a href="/inventory/products/new" className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
              <Package className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-blue-700">Nuevo producto</span>
            </a>
            <a href="/clients/new" className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors">
              <Users className="w-5 h-5 text-purple-600" />
              <span className="font-medium text-purple-700">Nuevo cliente</span>
            </a>
          </div>
        </div>
      </div>

      {/* Recent Activity Placeholder */}
      <div className="card">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Actividad reciente</h2>
          <a href="/sales" className="text-sm text-primary-600 hover:underline">Ver todo</a>
        </div>
        <div className="p-4 text-center text-gray-500">
          <Clock className="w-12 h-12 mx-auto text-gray-300 mb-2" />
          <p>El historial de actividad aparecerá aquí</p>
        </div>
      </div>
    </div>
  );
}