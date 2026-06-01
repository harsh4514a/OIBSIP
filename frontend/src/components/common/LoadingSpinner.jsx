import { motion } from 'framer-motion';

function LoadingSpinner({ size = 'default', text = '' }) {
  const sizes = { sm: 'w-8 h-8', default: 'w-12 h-12', lg: 'w-16 h-16', fullscreen: 'w-20 h-20' };
  const sizeClass = sizes[size] || sizes.default;
  const isFullscreen = size === 'fullscreen';
  
  const spinner = (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="relative">
        <motion.div
          className={`${sizeClass} rounded-full border-4 border-orange-100 border-t-orange-500`}
          animate={{ rotate: 360 }}
          transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl">🍕</span>
        </div>
      </div>
      {text && <p className="text-sm font-medium text-gray-500 dark:text-gray-400 animate-pulse">{text}</p>}
    </div>
  );

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm">
        {spinner}
      </div>
    );
  }
  return spinner;
}

export default LoadingSpinner;
