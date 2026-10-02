import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ComposedChart
} from 'recharts';
import { 
  Download, Calendar, Filter, TrendingUp, ShoppingCart, 
  Package, DollarSign, Users, FileText, AlertTriangle
} from 'lucide-react';
import { api } from '../api/client';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { formatCurrency, formatDate, cn } from '../utils/format';
import toast from 'react-hot-toast';

const COLORS = ['#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

function StatCard({ title, value, icon, color, trend }: { title: string; value: string; icon: React.ReactNode; color: string; trend?: string }) {
  return (
    <div className="card p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
          {trend && <p className="mt-2 text-sm text-green-600 flex items-center gap-1">{trend}</p>}
        </div>
        <div className={`p-3 rounded-xl ${color}`}>{icon}</div>
      </div>
    </div>
  );
}

function ChartCard({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {action}
      </div>
      <div className="h-72">{children}</div>
    </div>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-100">
        <p className="font-medium text-gray-900">{label}</p>
        {payload.map((entry: any, i: number) => (
          <p key={i} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {entry.value.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}
          </p>
        ))}
      </div>
    );
  }
  return null;
}

export function Reports() {
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [reportType, setReportType] = useState<'sales' | 'purchases' | 'topProducts' | 'lowStock' | 'cashFlow'>('sales');
  const [operatorFilter, setOperatorFilter] = useState('');
  const [clientFilter, setClientFilter] = useState('');

  // Quick date presets
  const today = new Date();
  const weekAgo = new Date(today); weekAgo.setDate(today.getDate() - 7);
  const monthAgo = new Date(today); monthAgo.setDate(today.getDate() - 30);

  const { data: dashboard } = useQuery({ queryKey: ['dashboard-stats'], queryFn: () => api.getDashboardStats() });
  const { data: salesReport } = useQuery({ 
    queryKey: ['sales-report', dateRange.from, dateRange.to, operatorFilter, clientFilter],
    queryFn: () => api.getSalesReport({ from: dateRange.from || weekAgo.toISOString(), to: dateRange.to || today.toISOString(), operatorId: operatorFilter || undefined, clientId: clientFilter || undefined }),
    enabled: !!dateRange.from && reportType === 'sales'
  });
  const { data: purchasesReport } = useQuery({ 
    queryKey: ['purchases-report', dateRange.from, dateRange.to],
    queryFn: () => api.getPurchasesReport({ from: dateRange.from || monthAgo.toISOString(), to: dateRange.to || today.toISOString() }),
    enabled: !!dateRange.from && reportType === 'purchases'
  });
  const { data: topProducts } = useQuery({ 
    queryKey: ['top-products', dateRange.from, dateRange.to],
    queryFn: () => api.getTopProductsReport({ from: dateRange.from || monthAgo.toISOString(), to: dateRange.to || today.toISOString(), limit: 10 }),
    enabled: !!dateRange.from && reportType === 'topProducts'
  });
  const { data: lowStock } = useQuery({ 
    queryKey: ['low-stock-report'],
    queryFn: () => api.getLowStockReport(),
    enabled: reportType === 'lowStock'
  });
  const { data: cashFlow } = useQuery({ 
    queryKey: ['cash-flow', dateRange.from, dateRange.to],
    queryFn: () => api.getCashFlowReport({ from: dateRange.from || monthAgo.toISOString(), to: dateRange.to || today.toISOString() }),
    enabled: !!dateRange.from && reportType === 'cashFlow'
  });

  const handleExport = async (type: string) => {
    try {
      let csv = '';
      let filename = '';
      if (type === 'sales' && salesReport?.data?.sales) {
        csv = [
          ['Folio', 'Fecha', 'Cliente', 'Operador', 'Subtotal', 'IVA', 'Total', 'Método', 'Estado'].join(','),
          ...salesReport.data.sales.map((s: any) => [s.folio, formatDate(s.createdAt), s.clientName || 'Público', s.operatorName || '', s.subtotal, s.taxAmount, s.total, s.paymentMethod, s.status].join(','))
        ].join('\n');
        filename = `ventas-${formatDate(new Date())}.csv`;
      } else if (type === 'topProducts' && topProducts?.data?.products) {
        csv = [['Producto', 'SKU', 'Cantidad', 'Ingresos', 'Costo', 'Margen %'].join(','),
          ...topProducts.data.products.map((p: any) => [p.name, p.sku, p.qtySold, p.revenue.toFixed(2), p.cost.toFixed(2), p.margin.toFixed(2)].join(','))
        ].join('\n');
        filename = `top-productos-${formatDate(new Date())}.csv`;
      }
      if (csv) {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
        toast.success('Reporte exportado');
      }
    } catch (err) {
      toast.error('Error al exportar');
    }
  };

  if (!dashboard?.data) return <div className="flex justify-center py-12">Cargando...</div>;

  const d = dashboard.data;
  const criticalCount = lowStock?.data?.alerts?.filter((a: any) => a.status === 'CRITICAL').length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-primary-600" /> Reportes
          </h1>
          <p className="text-gray-500">Análisis de ventas, compras e inventario</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => handleExport(reportType)}>
            <Download className="w-4 h-4" /> Exportar CSV
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {criticalCount > 0 && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-red-500" />
          <div>
            <p className="font-medium text-red-800">{criticalCount} productos en stock CRÍTICO</p>
            <p className="text-sm text-red-600">Ver reporte de Stock Crítico para detalles</p>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Ventas hoy" value={formatCurrency(d.today.totalAmount)} icon={<ShoppingCart className="w-6 h-6" />} color="bg-primary-100 text-primary-600" trend={`${d.today.salesCount} transacciones`} />
        <StatCard title="Ticket promedio" value={formatCurrency(d.today.avgTicket)} icon={<DollarSign className="w-6 h-6" />} color="bg-green-100 text-green-600" />
        <StatCard title="Productos activos" value={d.inventory.activeProducts} icon={<Package className="w-6 h-6" />} color="bg-blue-100 text-blue-600" trend={criticalCount > 0 ? `${criticalCount} críticos` : 'OK'} />
        <StatCard title="Clientes activos" value={d.clients.active} icon={<Users className="w-6 h-6" />} color="bg-purple-100 text-purple-600" />
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-col sm:flex-row gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gray-400" />
          <Input type="date" value={dateRange.from} onChange={e => setDateRange({...dateRange, from: e.target.value})} className="w-auto" placeholder="Desde" />
          <span className="text-gray-400">-</span>
          <Input type="date" value={dateRange.to} onChange={e => setDateRange({...dateRange, to: e.target.value})} className="w-auto" placeholder="Hasta" />
        </div>
        <div className="flex gap-2">
          <button onClick={() => setDateRange({ from: weekAgo.toISOString().split('T')[0], to: today.toISOString().split('T')[0] })} className="btn-secondary text-sm">Última semana</button>
          <button onClick={() => setDateRange({ from: monthAgo.toISOString().split('T')[0], to: today.toISOString().split('T')[0] })} className="btn-secondary text-sm">Último mes</button>
          <button onClick={() => setDateRange({ from: today.toISOString().split('T')[0], to: today.toISOString().split('T')[0] })} className="btn-secondary text-sm">Hoy</button>
        </div>
        {reportType === 'sales' && (
          <div className="flex gap-2">
            <Input placeholder="Filtrar operador..." value={operatorFilter} onChange={e => setOperatorFilter(e.target.value)} className="w-48" />
            <Input placeholder="Filtrar cliente..." value={clientFilter} onChange={e => setClientFilter(e.target.value)} className="w-48" />
          </div>
        )}
      </div>

      {/* Report Type Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1 overflow-x-auto pb-1" role="tablist">
          {[
            { id: 'sales', label: 'Ventas', icon: ShoppingCart },
            { id: 'purchases', label: 'Compras', icon: Package },
            { id: 'topProducts', label: 'Top Productos', icon: TrendingUp },
            { id: 'lowStock', label: 'Stock Crítico', icon: AlertTriangle },
            { id: 'cashFlow', label: 'Flujo Caja', icon: DollarSign }
          ].map(tab => (
            <button key={tab.id} role="tab" aria-selected={reportType === tab.id} onClick={() => setReportType(tab.id as any)}
              className={cn('flex items-center gap-1 px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors', reportType === tab.id ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700')}>
              <tab.icon className="w-4 h-4" /> {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Report Content */}
      <div className="space-y-6">
        {reportType === 'sales' && salesReport?.data && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartCard title="Ventas por día" action={<Button variant="ghost" size="sm" onClick={() => handleExport('sales')}>Exportar</Button>}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={salesReport.data.byDay}>
                    <defs>
                      <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="date" tickFormatter={(v) => formatDate(v)} stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" tickFormatter={(v) => formatCurrency(v)} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="total" stroke="#0ea5e9" fillOpacity={1} fill="url(#salesGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Ventas por método de pago">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={salesReport.data.byPaymentMethod.map((m: any) => ({ name: m.method, value: m.total }))}
                      cx="50%" cy="50%" innerRadius={60} outerRadius={100}
                      paddingAngle={2} dataKey="total" nameKey="name"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {salesReport.data.byPaymentMethod.map((_: any, i: number) => <Cell key={`cell-${i}`} fill={COLORS[i]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartCard title="Top Operadores">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salesReport.data.byOperator} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} stroke="#9ca3af" />
                    <YAxis type="category" dataKey="name" width={120} stroke="#9ca3af" />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="total" fill="#0ea5e9" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Top Clientes">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salesReport.data.topClients} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} stroke="#9ca3af" />
                    <YAxis type="category" dataKey="name" width={120} stroke="#9ca3af" />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="total" fill="#22c55e" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          </>
        )}

        {reportType === 'purchases' && purchasesReport?.data && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard title="Compras por día">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={purchasesReport.data.byDay}>
                  <defs>
                    <linearGradient id="purchasesGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" tickFormatter={(v) => formatDate(v)} stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" tickFormatter={(v) => formatCurrency(v)} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="total" stroke="#f59e0b" fillOpacity={1} fill="url(#purchasesGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Compras por proveedor">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={purchasesReport.data.bySupplier} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} stroke="#9ca3af" />
                  <YAxis type="category" dataKey="name" width={140} stroke="#9ca3af" />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="total" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        )}

        {reportType === 'topProducts' && topProducts?.data && (
          <ChartCard title="Top 10 Productos Vendidos" action={<Button variant="ghost" size="sm" onClick={() => handleExport('topProducts')}>Exportar</Button>}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={topProducts.data.products.slice().reverse()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} stroke="#9ca3af" />
                <YAxis type="category" dataKey="name" width={180} stroke="#9ca3af" />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="revenue" fill="#0ea5e9" radius={[0, 4, 4, 0]} name="Ingresos" />
                <Bar dataKey="cost" fill="#ef4444" radius={[0, 4, 4, 0]} name="Costo" />
                <Line type="monotone" dataKey="margin" stroke="#22c55e" strokeWidth={2} dot={{ fill: '#22c55e', strokeWidth: 2 }} yAxisId="right" name="Margen %" />
                <YAxis yAxisId="right" orientation="right" type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} stroke="#9ca3af" />
                <Legend />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {reportType === 'lowStock' && lowStock?.data && (
          <div className="card">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Productos con Stock Bajo/Crítico</h3>
              <span className="text-sm text-gray-500">{lowStock.data.alerts.length} productos</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <th className="px-4 py-3">Producto</th>
                    <th className="px-4 py-3">SKU</th>
                    <th className="px-4 py-3">Stock</th>
                    <th className="px-4 py-3">Mínimo</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Venta diaria</th>
                    <th className="px-4 py-3">Días para agotar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {lowStock.data.alerts.map((a: any) => (
                    <tr key={a.productId} className={a.status === 'CRITICAL' ? 'bg-red-50' : 'bg-yellow-50'}>
                      <td className="px-4 py-3 font-medium">{a.productName}</td>
                      <td className="px-4 py-3 font-mono text-sm">{a.sku}</td>
                      <td className="px-4 py-3 font-mono font-medium text-red-600">{a.currentStock} {a.unit || ''}</td>
                      <td className="px-4 py-3">{a.minStock}</td>
                      <td className="px-4 py-3">
                        <span className={cn('badge', a.status === 'CRITICAL' ? 'badge-danger' : 'badge-warning')}>{a.status}</span>
                      </td>
                      <td className="px-4 py-3">{a.dailyAverage}</td>
                      <td className="px-4 py-3">{a.daysUntilStockout ?? 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {reportType === 'cashFlow' && cashFlow?.data && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <StatCard title="Ingresos (cobrado)" value={formatCurrency(cashFlow.data.summary.totalInflow)} icon={<TrendingUp className="w-6 h-6" />} color="bg-green-100 text-green-600" />
            <StatCard title="Egresos (pagado)" value={formatCurrency(cashFlow.data.summary.totalOutflow)} icon={<TrendingUp className="w-6 h-6" />} color="bg-red-100 text-red-600" />
            <StatCard title="Flujo Neto" value={formatCurrency(cashFlow.data.summary.net)} icon={<DollarSign className="w-6 h-6" />} color={cn('text-white', cashFlow.data.summary.net >= 0 ? 'bg-green-600' : 'bg-red-600')} />

            <ChartCard title="Flujo de Caja Diario" action={<Button variant="ghost" size="sm" onClick={() => handleExport('cashFlow')}>Exportar</Button>}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={cashFlow.data.daily}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" tickFormatter={(v) => formatDate(v)} stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" tickFormatter={(v) => formatCurrency(v)} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="inflow" stroke="#22c55e" fillOpacity={1} fill="url(#inflowGradient)" name="Ingresos" />
                  <Area type="monotone" dataKey="outflow" stroke="#ef4444" fillOpacity={1} fill="url(#outflowGradient)" name="Egresos" />
                  <Line type="monotone" dataKey="net" stroke="#0ea5e9" strokeWidth={2} dot={{ fill: '#0ea5e9', strokeWidth: 2 }} name="Neto" />
                  <defs>
                    <linearGradient id="inflowGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="outflowGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Legend />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        )}
      </div>
    </div>
  );
}