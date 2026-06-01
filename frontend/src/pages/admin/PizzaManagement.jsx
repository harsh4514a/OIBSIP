import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Edit, Trash2, Eye, EyeOff, Search, Image } from 'lucide-react'
import AdminLayout from '../../components/layout/AdminLayout'
import { getAllPizzas, createPizza, updatePizza, deletePizza, toggleAvailability } from '../../api/pizza'
import { formatCurrency } from '../../lib/utils'
import toast from 'react-hot-toast'

const PIZZA_CATEGORIES = [
  { value: 'classic', label: 'Classic', color: 'bg-orange-100 text-orange-700' },
  { value: 'cheese', label: 'Cheese', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'italian', label: 'Italian', color: 'bg-green-100 text-green-700' },
  { value: 'mexican', label: 'Mexican', color: 'bg-red-100 text-red-700' },
  { value: 'indian-fusion', label: 'Indian Fusion', color: 'bg-amber-100 text-amber-700' },
  { value: 'spicy', label: 'Spicy', color: 'bg-rose-100 text-rose-700' },
  { value: 'premium', label: 'Premium', color: 'bg-purple-100 text-purple-700' },
  { value: 'signature', label: 'Signature', color: 'bg-indigo-100 text-indigo-700' },
]

const EMPTY_FORM = { name: '', description: '', category: 'classic', basePrice: '', ingredients: '', isFeatured: false, isAvailable: true, imageUrl: '' }

export default function PizzaManagement() {
  const [pizzas, setPizzas] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editPizza, setEditPizza] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [imageFile, setImageFile] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchPizzas = async () => {
    setLoading(true)
    try {
      const { data } = await getAllPizzas({ search, page, limit: 10, category: categoryFilter || undefined })
      setPizzas(data.data?.pizzas || [])
      setTotalPages(data.data?.pagination?.pages || 1)
    } catch { toast.error('Failed to load pizzas') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchPizzas() }, [search, page, categoryFilter])

  const openCreate = () => { setForm(EMPTY_FORM); setImageFile(null); setEditPizza(null); setShowModal(true) }
  const openEdit = (pizza) => {
    setForm({
      name: pizza.name || '',
      description: pizza.description || '',
      category: pizza.category || 'classic',
      basePrice: pizza.basePrice || '',
      ingredients: pizza.ingredients?.join(', ') || '',
      isFeatured: pizza.isFeatured || false,
      isAvailable: pizza.isAvailable || false,
      imageUrl: pizza.image || '',
    })
    setImageFile(null)
    setEditPizza(pizza)
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name || !form.basePrice) return toast.error('Name and price are required')
    setSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('name', form.name)
      formData.append('description', form.description)
      formData.append('category', form.category)
      formData.append('basePrice', Number(form.basePrice))
      formData.append('ingredients', JSON.stringify((form.ingredients || '').split(',').map(s => s.trim()).filter(Boolean)))
      formData.append('isFeatured', form.isFeatured)
      formData.append('isAvailable', form.isAvailable)

      if (imageFile) {
        formData.append('image', imageFile)
      } else if (form.imageUrl) {
        formData.append('image', form.imageUrl)
      } else {
        formData.append('image', `https://picsum.photos/seed/${form.name}/400/400`)
      }

      if (editPizza) {
        const { data } = await updatePizza(editPizza._id, formData)
        setPizzas(prev => prev.map(p => p._id === editPizza._id ? data.data.pizza : p))
        toast.success('Pizza updated!')
      } else {
        const { data } = await createPizza(formData)
        setPizzas(prev => [data.data.pizza, ...prev])
        toast.success('Pizza created! 🍕')
      }
      setShowModal(false)
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
    finally { setSubmitting(false) }
  }

  const handleDelete = async (pizzaId) => {
    if (!confirm('Delete this pizza?')) return
    try {
      await deletePizza(pizzaId)
      setPizzas(prev => prev.filter(p => p._id !== pizzaId))
      toast.success('Pizza deleted')
    } catch { toast.error('Failed') }
  }

  const handleToggle = async (pizzaId, current) => {
    try {
      const { data } = await toggleAvailability(pizzaId)
      setPizzas(prev => prev.map(p => p._id === pizzaId ? data.data.pizza : p))
    } catch { toast.error('Failed') }
  }

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Pizza Management</h1>
            <p className="text-muted-foreground mt-1">Manage your pizza menu</p>
          </div>
          <motion.button onClick={openCreate} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-500 text-white font-semibold shadow-lg shadow-orange-500/30 hover:bg-orange-600 transition-colors">
            <Plus className="w-4 h-4" /> Add Pizza
          </motion.button>
        </div>

        {/* Search */}
        <div className="flex items-center gap-4 mb-6 flex-wrap">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Search pizzas..."
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500" />
          </div>
          <select value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setPage(1) }}
            className="px-4 py-3 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-orange-500">
            <option value="">All Categories</option>
            {PIZZA_CATEGORIES.map(cat => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr className="text-left text-muted-foreground">
                  {['Pizza', 'Category', 'Price', 'Rating', 'Featured', 'Available', 'Actions'].map(h => (
                    <th key={h} className="px-5 py-4 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  Array(5).fill(0).map((_, i) => (
                    <tr key={i}><td colSpan={7} className="px-5 py-4"><div className="h-8 bg-muted rounded animate-pulse" /></td></tr>
                  ))
                ) : pizzas.length === 0 ? (
                  <tr><td colSpan={7} className="px-5 py-12 text-center text-muted-foreground">No pizzas found</td></tr>
                ) : pizzas.map(pizza => (
                  <tr key={pizza._id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <img src={pizza.image || `https://picsum.photos/seed/${pizza._id}/40/40`} alt={pizza.name} className="w-10 h-10 rounded-xl object-cover bg-muted" />
                        <span className="font-medium text-foreground">{pizza.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 capitalize">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${PIZZA_CATEGORIES.find(c => c.value === pizza.category)?.color || 'bg-muted text-muted-foreground'}`}>
                        {PIZZA_CATEGORIES.find(c => c.value === pizza.category)?.label || pizza.category}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-semibold">{formatCurrency(pizza.basePrice)}</td>
                    <td className="px-5 py-4">⭐ {pizza.ratings?.average?.toFixed(1) || '—'}</td>
                    <td className="px-5 py-4">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${pizza.isFeatured ? 'bg-yellow-100 text-yellow-700' : 'bg-muted text-muted-foreground'}`}>
                        {pizza.isFeatured ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <button onClick={() => handleToggle(pizza._id, pizza.isAvailable)}
                        className={`w-12 h-6 rounded-full transition-all ${pizza.isAvailable ? 'bg-green-500' : 'bg-muted'} relative`}>
                        <div className={`w-5 h-5 bg-white rounded-full shadow absolute top-0.5 transition-all ${pizza.isAvailable ? 'right-0.5' : 'left-0.5'}`} />
                      </button>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(pizza)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 transition-colors"><Edit className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(pizza._id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-5 py-4 border-t border-border flex items-center justify-between">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 rounded-lg border border-border text-sm disabled:opacity-40 hover:bg-muted transition-colors">Previous</button>
              <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 rounded-lg border border-border text-sm disabled:opacity-40 hover:bg-muted transition-colors">Next</button>
            </div>
          )}
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="bg-card border border-border rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
              <h2 className="font-display font-bold text-xl text-foreground mb-6">{editPizza ? 'Edit Pizza' : 'Add New Pizza'}</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                {[['name', 'Pizza Name', 'text'], ['description', 'Description', 'text'], ['basePrice', 'Base Price (₹)', 'number'], ['ingredients', 'Ingredients (comma separated)', 'text']].map(([k, l, t]) => (
                  <div key={k}>
                    <label className="text-sm font-medium mb-1.5 block">{l}</label>
                    {k === 'description' ? (
                      <textarea value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} rows={3}
                        className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none" />
                    ) : (
                      <input type={t} value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
                        className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500" />
                    )}
                  </div>
                ))}
                
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Pizza Image</label>
                  <div className="flex gap-4 items-center">
                    <label className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl p-4 bg-muted/20 cursor-pointer hover:border-orange-500 hover:bg-orange-500/5 transition-all">
                      <div className="flex flex-col items-center justify-center pt-1 pb-1 text-center">
                        <Image className="w-8 h-8 text-muted-foreground mb-2" />
                        <p className="text-sm font-semibold text-foreground">Upload from Gallery</p>
                        <p className="text-xs text-muted-foreground mt-0.5">PNG, JPG, WEBP up to 5MB</p>
                      </div>
                      <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                        const file = e.target.files[0]
                        if (file) {
                          setImageFile(file)
                          setForm(f => ({ ...f, imageUrl: URL.createObjectURL(file) }))
                        }
                      }} />
                    </label>

                    {form.imageUrl && (
                      <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-border bg-muted flex-shrink-0">
                        <img src={form.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                        <button type="button" onClick={() => { setImageFile(null); setForm(f => ({ ...f, imageUrl: '' })) }}
                          className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition-colors shadow">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="mt-2.5">
                    <details className="cursor-pointer group">
                      <summary className="text-xs text-muted-foreground hover:text-orange-500 transition-colors select-none">
                        Or enter image URL instead
                      </summary>
                      <input type="text" value={imageFile ? '' : form.imageUrl} disabled={!!imageFile}
                        onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))}
                        placeholder="https://example.com/pizza.jpg"
                        className="w-full px-4 py-2 mt-1.5 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50" />
                    </details>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">Category</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500">
                    {PIZZA_CATEGORIES.map(cat => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
                  </select>
                </div>
                <div className="flex gap-6">
                  {[['isFeatured', 'Featured'], ['isAvailable', 'Available']].map(([k, l]) => (
                    <label key={k} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.checked }))} className="accent-orange-500 w-4 h-4" />
                      <span className="text-sm font-medium">{l}</span>
                    </label>
                  ))}
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={submitting}
                    className="flex-1 py-3 rounded-xl bg-orange-500 text-white font-semibold hover:bg-orange-600 transition-colors disabled:opacity-60">
                    {submitting ? 'Saving...' : editPizza ? 'Update Pizza' : 'Create Pizza'}
                  </button>
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 rounded-xl border border-border font-semibold hover:bg-muted transition-colors">Cancel</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
