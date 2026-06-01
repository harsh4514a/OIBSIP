import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '../../lib/utils';

function StarRating({ value = 0, onChange, max = 5, size = 20, readOnly = false, className }) {
  const [hovered, setHovered] = useState(0);

  return (
    <div className={cn('flex items-center gap-0.5', className)}>
      {Array.from({ length: max }).map((_, i) => {
        const starValue = i + 1;
        const filled = readOnly ? starValue <= value : starValue <= (hovered || value);
        return (
          <button
            key={i}
            type="button"
            disabled={readOnly}
            onClick={() => onChange?.(starValue)}
            onMouseEnter={() => !readOnly && setHovered(starValue)}
            onMouseLeave={() => !readOnly && setHovered(0)}
            className={cn(
              'transition-all duration-100',
              !readOnly && 'hover:scale-110 cursor-pointer',
              readOnly && 'cursor-default'
            )}
          >
            <Star
              size={size}
              className={cn(
                'transition-colors duration-100',
                filled ? 'fill-orange-400 text-orange-400' : 'fill-gray-200 text-gray-300 dark:fill-gray-600 dark:text-gray-600'
              )}
            />
          </button>
        );
      })}
    </div>
  );
}

export default StarRating;
