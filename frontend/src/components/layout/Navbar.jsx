import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingCart, User, Menu, X, ChevronDown,
  LogOut, Package, Heart, Settings, Pizza, LayoutDashboard, Ticket
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useCart } from '../../hooks/useCart';
import ThemeToggle from '../common/ThemeToggle';
import '../pizza/pureVegBadge.css';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/Avatar';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'Menu', href: '/menu' },
  { label: 'Build Your Pizza', href: '/build' },
  { label: 'Track Order', href: '/orders' },
];

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { itemCount } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <>
      <motion.header
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl shadow-lg border-b border-gray-200/50 dark:border-gray-700/50'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 group">
              <motion.span
                className="text-2xl"
                animate={{ rotate: [0, -10, 10, -5, 0] }}
                transition={{ duration: 0.5, delay: 1, repeat: Infinity, repeatDelay: 5 }}
              >
                🍕
              </motion.span>
              <span className="text-xl font-bold font-display bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                PizzaHub
              </span>
              <span className="pure-veg-indicator hidden sm:inline-flex">Pure Veg</span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => {
                const active = location.pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    to={link.href}
                    className={`relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                      active
                        ? 'text-orange-500'
                        : 'text-gray-600 dark:text-gray-300 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/30'
                    }`}
                  >
                    {link.label}
                    {active && (
                      <motion.div
                        layoutId="activeNav"
                        className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-4 bg-orange-500 rounded-full"
                      />
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Right side */}
            <div className="flex items-center gap-2">
              <ThemeToggle />

              {/* Cart */}
              <Link
                to="/cart"
                className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:border-orange-500 hover:text-orange-500 transition-colors"
              >
                <ShoppingCart size={18} />
                {itemCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-white text-[10px] font-bold"
                  >
                    {itemCount > 99 ? '99+' : itemCount}
                  </motion.span>
                )}
              </Link>

              {/* User dropdown */}
              {isAuthenticated ? (
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <button className="flex items-center gap-2 rounded-lg px-2 py-1 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-orange-500 transition-colors">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={user?.avatar} />
                        <AvatarFallback className="text-[10px]">{user?.name?.[0]}</AvatarFallback>
                      </Avatar>
                      <span className="hidden md:block text-sm font-medium text-gray-700 dark:text-gray-300 max-w-20 truncate">
                        {user?.name?.split(' ')[0]}
                      </span>
                      <ChevronDown size={14} className="text-gray-400" />
                    </button>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Portal>
                    <DropdownMenu.Content
                      sideOffset={8}
                      align="end"
                      className="z-50 min-w-[200px] rounded-xl border border-gray-200 bg-white dark:bg-gray-900 dark:border-gray-700 shadow-xl p-1.5 animate-scale-in"
                    >
                      <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800 mb-1">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{user?.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
                      </div>
                      {isAdmin && (
                        <DropdownMenu.Item asChild>
                          <Link to="/admin" className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-orange-50 dark:hover:bg-orange-950/30 hover:text-orange-600 dark:hover:text-orange-400 cursor-pointer outline-none transition-colors">
                            <LayoutDashboard size={15} /> Admin Dashboard
                          </Link>
                        </DropdownMenu.Item>
                      )}
                      <DropdownMenu.Item asChild>
                        <Link to="/profile" className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer outline-none transition-colors text-gray-700 dark:text-gray-300">
                          <User size={15} /> My Profile
                        </Link>
                      </DropdownMenu.Item>
                      <DropdownMenu.Item asChild>
                        <Link to="/orders" className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer outline-none transition-colors text-gray-700 dark:text-gray-300">
                          <Package size={15} /> My Orders
                        </Link>
                      </DropdownMenu.Item>
                      <DropdownMenu.Item asChild>
                        <Link to="/wishlist" className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer outline-none transition-colors text-gray-700 dark:text-gray-300">
                          <Heart size={15} /> Wishlist
                        </Link>
                      </DropdownMenu.Item>
                      <DropdownMenu.Item asChild>
                        <Link to="/coupons" className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer outline-none transition-colors text-gray-700 dark:text-gray-300">
                          <Ticket size={15} /> My Coupons
                        </Link>
                      </DropdownMenu.Item>
                      <DropdownMenu.Separator className="h-px bg-gray-100 dark:bg-gray-800 my-1" />
                      <DropdownMenu.Item
                        onSelect={handleLogout}
                        className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-red-500 cursor-pointer outline-none transition-colors"
                      >
                        <LogOut size={15} /> Logout
                      </DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>
              ) : (
                <Link
                  to="/auth/login"
                  className="hidden md:flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-lg shadow-orange-500/25"
                >
                  Sign In
                </Link>
              )}

              {/* Mobile hamburger */}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="md:hidden flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-orange-500 transition-colors"
              >
                {mobileOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 bottom-0 z-40 w-72 bg-white dark:bg-gray-900 shadow-2xl md:hidden flex flex-col"
            >
              <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🍕</span>
                  <span className="font-bold font-display text-orange-500">PizzaHub</span>
                  <span className="pure-veg-indicator">Pure Veg</span>
                </div>
                <button onClick={() => setMobileOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <X size={20} />
                </button>
              </div>

              {isAuthenticated && (
                <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user?.avatar} />
                    <AvatarFallback>{user?.name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">{user?.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
                  </div>
                </div>
              )}

              <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    to={link.href}
                    className={`flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      location.pathname === link.href
                        ? 'bg-orange-50 dark:bg-orange-950/30 text-orange-500'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
                {isAuthenticated && (
                  <>
                    <div className="border-t border-gray-100 dark:border-gray-800 pt-2 mt-2">
                      {isAdmin && (
                        <Link to="/admin" className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/30 transition-colors">
                          <LayoutDashboard size={16} /> Admin Dashboard
                        </Link>
                      )}
                      <Link to="/profile" className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <User size={16} /> My Profile
                      </Link>
                      <Link to="/orders" className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <Package size={16} /> My Orders
                      </Link>
                      <Link to="/wishlist" className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <Heart size={16} /> Wishlist
                      </Link>
                      <Link to="/coupons" className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <Ticket size={16} /> My Coupons
                      </Link>
                    </div>
                  </>
                )}
              </nav>

              <div className="p-4 border-t border-gray-100 dark:border-gray-800 space-y-2">
                {isAuthenticated ? (
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                  >
                    <LogOut size={16} /> Logout
                  </button>
                ) : (
                  <Link
                    to="/auth/login"
                    className="flex w-full items-center justify-center bg-orange-500 hover:bg-orange-600 text-white px-4 py-3 rounded-lg text-sm font-semibold transition-colors"
                  >
                    Sign In
                  </Link>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

export default Navbar;
