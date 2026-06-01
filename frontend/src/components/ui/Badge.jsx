import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
        secondary: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
        destructive: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        outline: 'border border-current text-gray-700 dark:text-gray-300',
        success: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        warning: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
        info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        veg: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-500',
        nonveg: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-500',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

function Badge({ className, variant, ...props }) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
export default Badge;
