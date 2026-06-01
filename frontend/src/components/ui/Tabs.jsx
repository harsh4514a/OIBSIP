import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '../../lib/utils';

function Tabs({ className, ...props }) {
  return <TabsPrimitive.Root className={cn('', className)} {...props} />;
}

function TabsList({ className, ...props }) {
  return (
    <TabsPrimitive.List
      className={cn(
        'inline-flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 p-1',
        className
      )}
      {...props}
    />
  );
}

function TabsTrigger({ className, ...props }) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-all',
        'text-gray-600 dark:text-gray-400',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500',
        'disabled:pointer-events-none disabled:opacity-50',
        'data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:shadow-sm',
        'dark:data-[state=active]:bg-gray-900 dark:data-[state=active]:text-orange-400',
        className
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }) {
  return (
    <TabsPrimitive.Content
      className={cn('mt-4 focus-visible:outline-none', className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
export default Tabs;
