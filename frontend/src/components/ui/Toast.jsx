import { Toaster } from 'react-hot-toast';
import { useTheme } from '../../hooks/useTheme';

function ToastProvider() {
  const { isDark } = useTheme();
  return (
    <Toaster
      position="top-right"
      reverseOrder={false}
      gutter={8}
      toastOptions={{
        duration: 3000,
        style: {
          background: isDark ? '#1f2937' : '#ffffff',
          color: isDark ? '#f9fafb' : '#111827',
          border: isDark ? '1px solid #374151' : '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '12px 16px',
          fontSize: '14px',
          fontWeight: '500',
          boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
        },
        success: {
          iconTheme: { primary: '#f97316', secondary: '#fff' },
        },
        error: {
          iconTheme: { primary: '#ef4444', secondary: '#fff' },
        },
      }}
    />
  );
}

export default ToastProvider;
