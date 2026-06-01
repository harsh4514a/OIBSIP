import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

function Breadcrumb({ items }) {
  return (
    <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400" aria-label="Breadcrumb">
      <Link to="/" className="flex items-center gap-1 hover:text-orange-500 transition-colors">
        <Home size={14} />
        <span>Home</span>
      </Link>
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <ChevronRight size={14} className="text-gray-300 dark:text-gray-600" />
          {item.href && index < items.length - 1 ? (
            <Link to={item.href} className="hover:text-orange-500 transition-colors">{item.label}</Link>
          ) : (
            <span className={index === items.length - 1 ? 'text-gray-900 dark:text-gray-100 font-medium' : ''}>{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
}

export default Breadcrumb;
