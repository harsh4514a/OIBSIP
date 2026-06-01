import { PackageOpen } from 'lucide-react';
import { motion } from 'framer-motion';
import Button from './Button';

function EmptyState({ 
  icon: Icon = PackageOpen, 
  title = 'Nothing here yet', 
  description = '', 
  action, 
  onAction,
  actionLabel 
}) {
  const handleAction = action || onAction;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 px-4 text-center"
    >
      <div className="mb-6 rounded-full bg-orange-100 dark:bg-orange-900/30 p-6 flex items-center justify-center">
        {typeof Icon === 'string' ? (
          <span className="text-4xl select-none leading-none">{Icon}</span>
        ) : (
          <Icon size={40} className="text-orange-500" />
        )}
      </div>
      <h3 className="text-xl font-semibold font-display text-gray-900 dark:text-gray-100 mb-2">{title}</h3>
      {description && (
        <p className="text-gray-500 dark:text-gray-400 max-w-sm mb-6">{description}</p>
      )}
      {handleAction && actionLabel && (
        <Button onClick={handleAction}>{actionLabel}</Button>
      )}
    </motion.div>
  );
}

export default EmptyState;
