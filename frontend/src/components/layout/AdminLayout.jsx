import AdminSidebar from './AdminSidebar';
import { Bell } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/Avatar';
import ThemeToggle from '../common/ThemeToggle';

function AdminLayout({ children }) {
  const { user } = useAuth();
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0" style={{ marginLeft: '240px' }}>
        {/* Top bar */}
        <header className="flex items-center justify-between h-16 px-6 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-30 flex-shrink-0">
          <div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white font-display">Admin Portal</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">Manage your pizza business</p>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-orange-500 transition-colors">
              <Bell size={18} />
              <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center">3</span>
            </button>
            <div className="flex items-center gap-2 pl-2 border-l border-gray-200 dark:border-gray-700">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.avatar} />
                <AvatarFallback className="text-xs">{user?.name?.[0] || 'A'}</AvatarFallback>
              </Avatar>
              <div className="hidden md:block">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Administrator</p>
              </div>
            </div>
          </div>
        </header>
        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;
