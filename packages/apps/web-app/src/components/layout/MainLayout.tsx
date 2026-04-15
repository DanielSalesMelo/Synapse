import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  DollarSign, 
  LogOut, 
  User as UserIcon,
  Menu,
  X
} from 'lucide-react';

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { user, logout } = useAuth0();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);

  const menuItems = [
    { name: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" />, href: '/dashboard' },
    { name: 'Vendas', icon: <ShoppingCart className="w-5 h-5" />, href: '#' },
    { name: 'Financeiro', icon: <DollarSign className="w-5 h-5" />, href: '#' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside 
        className={`${
          isSidebarOpen ? 'w-64' : 'w-20'
        } bg-white border-r border-gray-200 transition-all duration-300 ease-in-out flex flex-col`}
      >
        {/* Logo Section */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-100">
          {isSidebarOpen && <span className="text-xl font-bold text-indigo-600">NexCore</span>}
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1 rounded-lg hover:bg-gray-100 text-gray-500"
          >
            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 py-6 px-4 space-y-2">
          {menuItems.map((item) => (
            <a
              key={item.name}
              href={item.href}
              className="flex items-center space-x-3 p-3 rounded-xl text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
            >
              {item.icon}
              {isSidebarOpen && <span className="font-medium">{item.name}</span>}
            </a>
          ))}
        </nav>

        {/* User Profile & Logout */}
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center space-x-3 mb-4 px-2">
            {user?.picture ? (
              <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                <UserIcon className="w-5 h-5" />
              </div>
            )}
            {isSidebarOpen && (
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-semibold text-gray-900 truncate">{user?.name}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
            )}
          </div>
          <button
            onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
            className="w-full flex items-center space-x-3 p-3 rounded-xl text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            {isSidebarOpen && <span className="font-medium">Sair</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-8">
          <h1 className="text-lg font-semibold text-gray-800">Painel de Controle</h1>
        </header>
        <div className="p-8 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
