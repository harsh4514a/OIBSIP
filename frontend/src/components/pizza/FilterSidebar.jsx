import { useState } from 'react';
import { motion } from 'framer-motion';
import { SlidersHorizontal, X, ChevronDown, ChevronUp } from 'lucide-react';

const PIZZA_CATEGORIES = [
  { value: 'classic', label: 'Classic' },
  { value: 'cheese', label: 'Cheese' },
  { value: 'italian', label: 'Italian' },
  { value: 'mexican', label: 'Mexican' },
  { value: 'indian-fusion', label: 'Indian Fusion' },
  { value: 'spicy', label: 'Spicy' },
  { value: 'premium', label: 'Premium' },
  { value: 'signature', label: 'Signature' },
];

function FilterSidebar({ filters, onChange, onClose }) {
  const [expanded, setExpanded] = useState({ category: true, price: true, rating: true });

  const toggle = (key) => setExpanded(e => ({ ...e, [key]: !e[key] }));

  const Section = ({ id, title, children }) => (
    <div className="border-b border-border pb-4">
      <button
        onClick={() => toggle(id)}
        className="flex w-full items-center justify-between py-2 text-sm font-semibold text-foreground"
      >
        {title}
        {expanded[id] ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
      </button>
      {expanded[id] && <div className="mt-2">{children}</div>}
    </div>
  );

  const resetFilters = () => {
    onChange({ minPrice: 0, maxPrice: 1000, minRating: 0, category: '' });
    onClose?.();
  };

  return (
    <div className="w-full rounded-xl border border-border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={18} className="text-orange-500" />
          <h3 className="font-semibold text-foreground">Filters</h3>
        </div>
        <button onClick={resetFilters} className="text-xs text-orange-500 hover:text-orange-600 font-medium flex items-center gap-1">
          <X size={12} /> Reset
        </button>
      </div>

      {/* Category */}
      <Section id="category" title="Category">
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={() => onChange({ ...filters, category: '' })}
            className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${!filters.category ? 'bg-orange-500 text-white' : 'bg-muted text-muted-foreground hover:bg-orange-100'}`}>
            All
          </button>
          {PIZZA_CATEGORIES.map(cat => (
            <button key={cat.value}
              onClick={() => onChange({ ...filters, category: cat.value })}
              className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${filters.category === cat.value ? 'bg-orange-500 text-white' : 'bg-muted text-muted-foreground hover:bg-orange-100'}`}>
              {cat.label}
            </button>
          ))}
        </div>
      </Section>

      {/* Price Range */}
      <Section id="price" title="Price Range">
        <div className="space-y-3 pt-1">
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>₹{filters.minPrice}</span>
              <span>₹{filters.maxPrice}</span>
            </div>
            <input
              type="range" min={0} max={1000} step={50}
              value={filters.maxPrice}
              onChange={e => onChange({ ...filters, maxPrice: Number(e.target.value) })}
              className="w-full accent-orange-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Under ₹200', min: 0, max: 200 },
              { label: '₹200–₹400', min: 200, max: 400 },
              { label: '₹400–₹600', min: 400, max: 600 },
              { label: 'Above ₹600', min: 600, max: 1000 },
            ].map(r => (
              <button key={r.label}
                onClick={() => onChange({ ...filters, minPrice: r.min, maxPrice: r.max })}
                className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${filters.minPrice === r.min && filters.maxPrice === r.max ? 'bg-orange-500 text-white' : 'bg-muted text-muted-foreground hover:bg-orange-100'}`}>
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </Section>

      {/* Min Rating */}
      <Section id="rating" title="Minimum Rating">
        <div className="flex gap-2 flex-wrap pt-1">
          {[0, 3, 3.5, 4, 4.5].map(r => (
            <button key={r}
              onClick={() => onChange({ ...filters, minRating: r })}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filters.minRating === r ? 'bg-orange-500 text-white' : 'bg-muted text-muted-foreground hover:bg-orange-100'}`}>
              {r === 0 ? 'All' : `${r}★+`}
            </button>
          ))}
        </div>
      </Section>
    </div>
  );
}

export default FilterSidebar;
