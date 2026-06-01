import { useEffect, useState, useCallback } from 'react'
import '../../components/pizza/pureVegBadge.css'
import { motion } from 'framer-motion'
import { SlidersHorizontal, X } from 'lucide-react'
import Navbar from '../../components/layout/Navbar'
import Footer from '../../components/layout/Footer'
import PizzaCard from '../../components/pizza/PizzaCard'
import FilterSidebar from '../../components/pizza/FilterSidebar'
import SearchBar from '../../components/ui/SearchBar'
import Pagination from '../../components/ui/Pagination'
import { SkeletonCard } from '../../components/ui/Skeleton'
import EmptyState from '../../components/ui/EmptyState'
import { getAllPizzas } from '../../api/pizza'
import { useDebounce } from '../../hooks/useDebounce'
import { useSearchParams } from 'react-router-dom'

const PIZZA_CATEGORIES = [
  { value: '', label: 'All' },
  { value: 'classic', label: 'Classic' },
  { value: 'cheese', label: 'Cheese' },
  { value: 'italian', label: 'Italian' },
  { value: 'mexican', label: 'Mexican' },
  { value: 'indian-fusion', label: 'Indian Fusion' },
  { value: 'spicy', label: 'Spicy' },
  { value: 'premium', label: 'Premium' },
  { value: 'signature', label: 'Signature' },
]

const SORT_OPTIONS = [
  { label: 'Popular', value: 'popular' },
  { label: 'Price: Low to High', value: 'price-low' },
  { label: 'Price: High to Low', value: 'price-high' },
  { label: 'Rating', value: 'rating' },
  { label: 'Newest', value: 'newest' },
]

export default function MenuPage() {
  const [pizzas, setPizzas] = useState([])
  const [loading, setLoading] = useState(true)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [showFilter, setShowFilter] = useState(false)

  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('popular')
  const [page, setPage] = useState(1)
  const [searchParams] = useSearchParams()
  const [filters, setFilters] = useState({ minPrice: 0, maxPrice: 1000, minRating: 0, category: searchParams.get('category') || '' })

  const debouncedSearch = useDebounce(search, 400)

  const fetchPizzas = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await getAllPizzas({
        search: debouncedSearch,
        sort,
        page,
        limit: 9,
        category: filters.category || undefined,
        minPrice: filters.minPrice || undefined,
        maxPrice: filters.maxPrice < 1000 ? filters.maxPrice : undefined,
        minRating: filters.minRating || undefined,
      })
      setPizzas(data.data?.pizzas || [])
      setTotalPages(data.data?.pagination?.pages || 1)
      setTotalCount(data.data?.pagination?.total || 0)
    } catch {
      setPizzas([])
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, sort, page, filters])

  useEffect(() => { fetchPizzas() }, [fetchPizzas])
  useEffect(() => { setPage(1) }, [debouncedSearch, sort, filters])

  const hasActiveFilters = search || filters.category || filters.minRating > 0 || filters.minPrice > 0 || filters.maxPrice < 1000

  const clearFilters = () => {
    setSearch('')
    setFilters({ minPrice: 0, maxPrice: 1000, minRating: 0, category: '' })
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-16">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-red-600 py-16 px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-7xl mx-auto text-center text-white">
            <h1 className="text-4xl lg:text-5xl font-display font-bold mb-4">Our Menu</h1>
            <p className="text-white/80 text-lg mb-4">Fresh, delicious pizzas crafted with the finest ingredients 🌿</p>
            <span className="pure-veg-trust-banner--light inline-flex mb-8">🟢 100% Pure Vegetarian Pizzas</span>
            <div className="max-w-xl mx-auto">
              <SearchBar value={search} onChange={setSearch} placeholder="Search pizzas..." />
            </div>
          </motion.div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
          {/* Category Pills */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
            {PIZZA_CATEGORIES.map(cat => (
              <button key={cat.value} onClick={() => setFilters(f => ({ ...f, category: cat.value }))}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  filters.category === cat.value
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30'
                    : 'bg-muted text-muted-foreground hover:bg-orange-100 hover:text-orange-600 dark:hover:bg-orange-950/30'
                }`}>
                {cat.label}
              </button>
            ))}
          </div>
          {/* Toolbar */}
          <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
            <p className="text-muted-foreground text-sm">
              {loading ? 'Loading...' : `${totalCount} pizzas found`}
            </p>
            <div className="flex items-center gap-3">
              <select value={sort} onChange={e => setSort(e.target.value)}
                className="px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-orange-500">
                {SORT_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
              <button onClick={() => setShowFilter(!showFilter)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm transition-colors ${showFilter ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-600' : 'border-border bg-background text-foreground hover:border-orange-500'}`}>
                <SlidersHorizontal className="w-4 h-4" /> Filters
              </button>
              {hasActiveFilters && (
                <button onClick={clearFilters} className="flex items-center gap-1 text-sm text-orange-500 hover:text-orange-600">
                  <X className="w-4 h-4" /> Clear
                </button>
              )}
            </div>
          </div>

          <div className="flex gap-8">
            {/* Filter Sidebar */}
            {showFilter && (
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="w-72 flex-shrink-0">
                <FilterSidebar filters={filters} onChange={setFilters} onClose={() => setShowFilter(false)} />
              </motion.div>
            )}

            {/* Pizza Grid */}
            <div className="flex-1">
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array(9).fill(0).map((_, i) => <SkeletonCard key={i} />)}
                </div>
              ) : pizzas.length === 0 ? (
                <EmptyState icon="🍕" title="No pizzas found" description="Try adjusting your search or filters" actionLabel="Clear Filters" onAction={clearFilters} />
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {pizzas.map((pizza, i) => (
                      <motion.div key={pizza._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                        <PizzaCard pizza={pizza} />
                      </motion.div>
                    ))}
                  </div>
                  {totalPages > 1 && (
                    <div className="mt-10 flex justify-center">
                      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}
