import { ReactNode } from 'react';
import { clsx } from 'clsx';

interface Column<T> {
  key: string;
  header: string;
  render?: (row: T, index: number) => ReactNode;
  className?: string;
  width?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  onRowClick?: (row: T) => void;
  loading?: boolean;
  emptyMessage?: string;
  striped?: boolean;
  hoverable?: boolean;
}

export function Table<T>({ 
  columns, data, keyExtractor, onRowClick, loading, 
  emptyMessage = 'No hay datos', striped = true, hoverable = true 
}: TableProps<T>) {
  if (loading) {
    return (
      <div className="card overflow-hidden">
        <div className="p-4">
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 animate-pulse rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="card overflow-hidden">
        <div className="p-8 text-center text-gray-500">
          {emptyMessage}
        </div>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {columns.map(col => (
                <th
                  key={col.key}
                  scope="col"
                  className={clsx(
                    'px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider',
                    col.className
                  )}
                  style={{ width: col.width }}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((row, rowIndex) => (
              <tr
                key={keyExtractor(row)}
                className={clsx(
                  striped && rowIndex % 2 === 1 && 'bg-gray-50',
                  hoverable && 'hover:bg-gray-50/50',
                  onRowClick && 'cursor-pointer'
                )}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map(col => (
                  <td
                    key={col.key}
                    className={clsx('px-4 py-3 text-sm text-gray-900', col.className)}
                  >
                    {col.render ? col.render(row, rowIndex) : (row as any)[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  showPages?: number;
}

export function Pagination({ currentPage, totalPages, onPageChange, showPages = 5 }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const start = Math.max(1, currentPage - Math.floor(showPages / 2));
  const end = Math.min(totalPages, start + showPages - 1);
  const visiblePages = pages.slice(start - 1, end);

  return (
    <nav className="flex items-center justify-between px-4 py-3 border-t border-gray-100" aria-label="Paginación">
      <div className="text-sm text-gray-500">
        Página {currentPage} de {totalPages}
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="btn-icon btn-secondary"
          aria-label="Página anterior"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        {visiblePages.map(page => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={clsx(
              'w-8 h-8 rounded-lg text-sm font-medium transition-colors',
              page === currentPage 
                ? 'bg-primary-600 text-white' 
                : 'text-gray-600 hover:bg-gray-100'
            )}
            aria-current={page === currentPage ? 'page' : undefined}
          >
            {page}
          </button>
        ))}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="btn-icon btn-secondary"
          aria-label="Página siguiente"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </nav>
  );
}