import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

function Pagination({ currentPage, totalPages, onPageChange, className }) {
  if (totalPages <= 1) return null;

  const pages = [];
  const delta = 2;
  
  for (let i = Math.max(1, currentPage - delta); i <= Math.min(totalPages, currentPage + delta); i++) {
    pages.push(i);
  }

  const btnClass = 'flex items-center justify-center h-9 w-9 rounded-lg text-sm font-medium transition-all duration-200';
  
  return (
    <div className={cn('flex items-center gap-1', className)}>
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={cn(btnClass, 'border border-gray-200 dark:border-gray-700 hover:border-orange-500 hover:text-orange-500 disabled:opacity-40 disabled:cursor-not-allowed text-gray-600 dark:text-gray-400')}
      >
        <ChevronLeft size={16} />
      </button>
      
      {pages[0] > 1 && (
        <>
          <button onClick={() => onPageChange(1)} className={cn(btnClass, 'border border-gray-200 dark:border-gray-700 hover:border-orange-500 hover:text-orange-500 text-gray-600 dark:text-gray-400')}>1</button>
          {pages[0] > 2 && <span className="text-gray-400 px-1">...</span>}
        </>
      )}
      
      {pages.map(page => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          className={cn(
            btnClass,
            page === currentPage
              ? 'bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-500/25'
              : 'border border-gray-200 dark:border-gray-700 hover:border-orange-500 hover:text-orange-500 text-gray-600 dark:text-gray-400'
          )}
        >
          {page}
        </button>
      ))}
      
      {pages[pages.length - 1] < totalPages && (
        <>
          {pages[pages.length - 1] < totalPages - 1 && <span className="text-gray-400 px-1">...</span>}
          <button onClick={() => onPageChange(totalPages)} className={cn(btnClass, 'border border-gray-200 dark:border-gray-700 hover:border-orange-500 hover:text-orange-500 text-gray-600 dark:text-gray-400')}>{totalPages}</button>
        </>
      )}
      
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={cn(btnClass, 'border border-gray-200 dark:border-gray-700 hover:border-orange-500 hover:text-orange-500 disabled:opacity-40 disabled:cursor-not-allowed text-gray-600 dark:text-gray-400')}
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

export default Pagination;
