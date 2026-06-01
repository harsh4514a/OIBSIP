import * as ProgressPrimitive from '@radix-ui/react-progress';
import { cn } from '../../lib/utils';

function Progress({ className, value = 0, max = 100, color = 'orange', ...props }) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const colorClass = {
    orange: 'bg-orange-500',
    green: 'bg-green-500',
    red: 'bg-red-500',
    blue: 'bg-blue-500',
    yellow: 'bg-yellow-500',
  }[color] || 'bg-orange-500';

  return (
    <ProgressPrimitive.Root
      className={cn(
        'relative h-2.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700',
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={`h-full ${colorClass} transition-all duration-500 ease-out rounded-full`}
        style={{ transform: `translateX(-${100 - percentage}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}

export default Progress;
