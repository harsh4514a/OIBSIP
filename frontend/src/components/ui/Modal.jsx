import * as Dialog from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

function Modal({ open, onOpenChange, title, description, children, className }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              />
            </Dialog.Overlay>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <Dialog.Content asChild>
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  transition={{ type: 'spring', duration: 0.3 }}
                  className={cn(
                    'w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl relative',
                    'dark:bg-gray-900 dark:border dark:border-gray-800',
                    'max-h-[90vh] overflow-y-auto',
                    className
                  )}
                >
                  <div className="flex items-center justify-between mb-4">
                    {title && (
                      <Dialog.Title className="text-xl font-semibold font-display text-gray-900 dark:text-white">
                        {title}
                      </Dialog.Title>
                    )}
                    <Dialog.Close asChild>
                      <button className="ml-auto rounded-lg p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                        <X size={18} />
                      </button>
                    </Dialog.Close>
                  </div>
                  {description && (
                    <Dialog.Description className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                      {description}
                    </Dialog.Description>
                  )}
                  {children}
                </motion.div>
              </Dialog.Content>
            </div>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}

export default Modal;
