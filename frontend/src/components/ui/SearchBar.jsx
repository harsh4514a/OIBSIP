import { useState, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '../../lib/utils';

function SearchBar({ value = '', onChange, placeholder = 'Search pizzas...', className }) {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef(null);

  const clear = () => {
    onChange?.('');
    inputRef.current?.focus();
  };

  return (
    <div
      className={cn(
        'relative flex items-center transition-all duration-300',
        focused ? 'w-80' : 'w-64',
        className
      )}
    >
      <Search
        size={18}
        className={cn(
          'absolute left-3.5 transition-colors duration-200',
          focused ? 'text-orange-500' : 'text-gray-400'
        )}
      />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        className={cn(
          'h-10 w-full rounded-xl border pl-10 pr-10 text-sm outline-none transition-all duration-200',
          'bg-gray-50 dark:bg-gray-800',
          focused
            ? 'border-orange-500 ring-2 ring-orange-500/20 bg-white dark:bg-gray-900'
            : 'border-gray-200 dark:border-gray-700',
          'text-gray-900 dark:text-gray-100 placeholder:text-gray-400'
        )}
      />
      {value && (
        <button
          onClick={clear}
          className="absolute right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}

export default SearchBar;
