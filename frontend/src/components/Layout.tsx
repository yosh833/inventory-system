import { Fragment, ReactNode, useState } from 'react';
import { Link, useLocation, NavLink, Outlet } from 'react-router-dom';
import { 
  LayoutDashboard, ShoppingCart, Package, Users, BarChart3, Settings, 
  LogOut, Menu, X, ChevronDown, Bell, User, Mic, MicOff
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { format } from '../utils/format';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Punto de Venta', href: '/pos', icon: ShoppingCart },
  { name: 'Inventario', href: '/inventory', icon: Package },
  { name: 'Compras', href: '/purchases', icon: Package },
  { name: 'Clientes', href: '/clients', icon: Users },
  { name: 'Reportes', href: '/reports', icon: BarChart3 },
];

const adminNavigation = [
  { name: 'Usuarios', href: '/admin/users', icon: Users },
  { name: 'Configuración', href: '/admin/settings', icon: Settings },
];

export function Layout() {
  const { user, isAdmin, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    logout();
    setShowLogoutConfirm(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden" 
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-100">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <span className="font-bold text-lg text-gray-900">Inventario</span>
            </Link>
            <button 
              onClick={() => setSidebarOpen(false)} 
              className="lg:hidden p-1 rounded-lg text-gray-400 hover:text-gray-600"
              aria-label="Cerrar menú"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Navegación principal">
            {navigation.map(item => {
              const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/');
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={({ isActive: active }) => `
                    flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                    ${active 
                      ? 'bg-primary-50 text-primary-700' 
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }
                  `}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                  {item.name}
                </NavLink>
              );
            })}
            
            {isAdmin() && (
              <Fragment>
                <div className="pt-4 mt-4 border-t border-gray-100">
                  <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Administración</p>
                </div>
                {adminNavigation.map(item => {
                  const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/');
                  return (
                    <NavLink
                      key={item.name}
                      to={item.href}
                      className={({ isActive: active }) => `
                        flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                        ${active 
                          ? 'bg-primary-50 text-primary-700' 
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                        }
                      `}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <item.icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                      {item.name}
                    </NavLink>
                  );
                })}
              </Fragment>
            )}
          </nav>

          {/* User info */}
          <div className="p-3 border-t border-gray-100">
            <div className="flex items-center gap-3 px-2 py-2">
              <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                <User className="w-5 h-5 text-primary-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{user?.fullName}</p>
                <p className="text-xs text-gray-500 capitalize">{user?.role?.toLowerCase()}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top header */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-100">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              aria-label="Abrir menú"
            >
              <Menu className="w-6 h-6" />
            </button>

            <div className="flex-1 lg:flex-none">
              <h1 className="text-lg font-semibold text-gray-900 truncate">
                {navigation.find(n => location.pathname === n.href || location.pathname.startsWith(n.href + '/'))?.name || 'Dashboard'}
              </h1>
            </div>

            <div className="flex items-center gap-4">
              {/* Voice button - only on POS */}
              {location.pathname === '/pos' && (
                <VoiceButton />
              )}

              {/* Notifications */}
              <button className="relative p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              </button>

              {/* User menu */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 p-1 rounded-lg hover:bg-gray-100 transition-colors"
                  aria-expanded={showUserMenu}
                  aria-haspopup="true"
                >
                  <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary-600" />
                  </div>
                  <span className="hidden sm:block text-sm font-medium text-gray-700">{user?.fullName}</span>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>

                {showUserMenu && (
                  <Fragment>
                    <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50">
                      <Link
                        to="/profile"
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <User className="w-4 h-4" />
                        Mi perfil
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-50"
                      >
                        <LogOut className="w-4 h-4" />
                        Cerrar sesión
                      </button>
                    </div>
                  </Fragment>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>

      {/* Logout confirmation modal */}
      <Modal 
        isOpen={showLogoutConfirm} 
        onClose={() => setShowLogoutConfirm(false)} 
        title="Cerrar sesión"
        size="sm"
      >
        <p className="text-gray-600">¿Estás seguro de que deseas cerrar sesión?</p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setShowLogoutConfirm(false)}>Cancelar</Button>
          <Button variant="danger" onClick={confirmLogout}>Cerrar sesión</Button>
        </div>
      </Modal>
    </div>
  );
}

function VoiceButton() {
  const [isListening, setIsListening] = useState(false);
  const [showPermissionError, setShowPermissionError] = useState(false);

  const handleClick = () => {
    if (!('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      setShowPermissionError(true);
      return;
    }

    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(() => {
        setIsListening(!isListening);
        setShowPermissionError(false);
      })
      .catch(() => {
        setShowPermissionError(true);
      });
  };

  if (showPermissionError) {
    return (
      <div className="relative">
        <Button variant="ghost" onClick={() => setShowPermissionError(false)} className="relative">
          <MicOff className="w-5 h-5 text-red-500" />
          <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">!</span>
        </Button>
        <div className="absolute bottom-full right-0 mb-2 w-64 bg-gray-900 text-white text-sm rounded-lg p-3 shadow-lg">
          <p>Se requiere permiso de micrófono para usar comandos de voz</p>
        </div>
      </div>
    );
  }

  return (
    <Button
      variant={isListening ? 'danger' : 'secondary'}
      onClick={handleClick}
      className="gap-2"
      aria-label={isListening ? 'Detener escucha' : 'Iniciar comando de voz'}
      aria-pressed={isListening}
    >
      {isListening ? <Mic className="w-5 h-5 animate-pulse" /> : <MicOff className="w-5 h-5" />}
      <span className="hidden sm:inline">{isListening ? 'Escuchando...' : 'Voz'}</span>
    </Button>
  );
}