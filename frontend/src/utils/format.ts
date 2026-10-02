export function formatCurrency(amount: number, currency = 'MXN', locale = 'es-MX'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2
  }).format(amount);
}

export const format = formatCurrency;

export function formatNumber(num: number, locale = 'es-MX'): string {
  return new Intl.NumberFormat(locale).format(num);
}

export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...options
  }).format(d);
}

export function formatDateTime(date: string | Date): string {
  return formatDate(date, { hour: '2-digit', minute: '2-digit' });
}

export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Hace un momento';
  if (minutes < 60) return `Hace ${minutes} min`;
  if (hours < 24) return `Hace ${hours} h`;
  if (days < 7) return `Hace ${days} día${days > 1 ? 's' : ''}`;
  return formatDate(d);
}

export function getStatusBadge(status: string): { className: string; label: string } {
  const statuses: Record<string, { className: string; label: string }> = {
    CONFIRMED: { className: 'badge-success', label: 'Confirmado' },
    PENDING: { className: 'badge-warning', label: 'Pendiente' },
    CANCELLED: { className: 'badge-danger', label: 'Cancelado' },
    REFUNDED: { className: 'badge-gray', label: 'Reembolsado' },
    ACTIVE: { className: 'badge-success', label: 'Activo' },
    INACTIVE: { className: 'badge-gray', label: 'Inactivo' }
  };
  return statuses[status] || { className: 'badge-gray', label: status };
}

export function getRoleBadge(role: string): { className: string; label: string } {
  const roles: Record<string, { className: string; label: string }> = {
    ADMIN: { className: 'badge-danger', label: 'Administrador' },
    OPERATOR: { className: 'badge-info', label: 'Operador' },
    CLIENT: { className: 'badge-gray', label: 'Cliente' }
  };
  return roles[role] || { className: 'badge-gray', label: role };
}

export function getPaymentMethodBadge(method: string): { className: string; label: string } {
  const methods: Record<string, { className: string; label: string }> = {
    CASH: { className: 'badge-success', label: 'Efectivo' },
    CARD: { className: 'badge-info', label: 'Tarjeta' },
    TRANSFER: { className: 'badge-primary', label: 'Transferencia' },
    CREDIT: { className: 'badge-warning', label: 'Crédito' },
    MIXED: { className: 'badge-gray', label: 'Mixto' }
  };
  return methods[method] || { className: 'badge-gray', label: method };
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function generateId(prefix = ''): string {
  return `${prefix}${Math.random().toString(36).substr(2, 9)}`;
}

export function debounce<T extends (...args: any[]) => any>(fn: T, ms: number): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), ms);
  };
}