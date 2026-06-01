import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, Plus, RefreshCw, Mail } from 'lucide-react'
import AdminLayout from '../../components/layout/AdminLayout'
import { getAllInventory, updateStock, getLowStockItems, triggerStockAlert, addInventoryItem } from '../../api/inventory'
import toast from 'react-hot-toast'

const TYPE_COLOR = { base: 'bg-yellow-100 text-yellow-700', sauce: 'bg-red-100 text-red-700', cheese: 'bg-orange-100 text-orange-700', veggie: 'bg-green-100 text-green-700' }
const TYPES = ['base', 'sauce', 'cheese', 'veggie']
const EMPTY_FORM = { ingredientType: 'base', name: '', currentStock: '', threshold: '', unit: 'kg', pricePerUnit: '' }

export default function InventoryManagement() {
  const [inventory, setInventory] = useState([])
  const [lowStock, setLowStock] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeType, setActiveType] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showStockModal, setShowStockModal] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [stockUpdate, setStockUpdate] = useState({ action: 'add', quantity: '', reason: '' })
  const [submitting, setSubmitting] = useState(false)
  const [alertSending, setAlertSending] = useState(false)

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [invRes, lowRes] = await Promise.all([getAllInventory({ type: activeType }), getLowStockItems()])
      setInventory(invRes.data.data?.items || [])
      setLowStock(lowRes.data.data?.lowStockItems || [])
    } catch { toast.error('Failed') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchAll() }, [activeType])

  const handleAddItem = async (e) => {
    e.preventDefault()
    if (!form.name || !form.currentStock || !form.threshold) return toast.error('Fill required fields')
    setSubmitting(true)
    try {
      const { data } = await addInventoryItem({ ...form, currentStock: Number(form.currentStock), threshold: Number(form.threshold), pricePerUnit: Number(form.pricePerUnit) })
      setInventory(prev => [data.data, ...prev])
      setShowAddModal(false)
      setForm(EMPTY_FORM)
      toast.success('Inventory item added!')
    } catch { toast.error('Failed') }
    finally { setSubmitting(false) }
  }

  const handleUpdateStock = async (e) => {
    e.preventDefault()
    if (!stockUpdate.quantity) return toast.error('Enter quantity')
    setSubmitting(true)
    try {
      const { data } = await updateStock(showStockModal._id, { action: stockUpdate.action, quantity: Number(stockUpdate.quantity), reason: stockUpdate.reason })
      setInventory(prev => prev.map(i => i._id === showStockModal._id ? data.data : i))
      setLowStock(prev => prev.filter(i => i._id !== data.data._id || data.data.currentStock <= data.data.threshold))
      setShowStockModal(null)
      toast.success('Stock updated!')
    } catch { toast.error('Failed') }
    finally { setSubmitting(false) }
  }

  const handleAlert = async () => {
    setAlertSending(true)
    try {
      await triggerStockAlert()
      toast.success('Low stock alert email sent to admin!')
    } catch { toast.error('Failed') }
    finally { setAlertSending(false) }
  }

  const getStockLevel = (item) => {
    const pct = (item.currentStock / (item.threshold * 3)) * 100
    return Math.min(100, Math.max(0, pct))
  }

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Inventory Management</h1>
            <p className="text-muted-foreground mt-1">Track and manage ingredient stock levels</p>
          </div>
          <div className="flex gap-3">
            {lowStock.length > 0 && (
              <button onClick={handleAlert} disabled={alertSending}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-orange-300 text-orange-600 text-sm font-medium hover:bg-orange-50 transition-colors disabled:opacity-60">
                <Mail className="w-4 h-4" /> {alertSending ? 'Sending...' : 'Send Alert'}
              </button>
            )}
            <button onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 transition-colors">
              <Plus className="w-4 h-4" /> Add Item
            </button>
          </div>
        </div>

        {/* Low Stock Alert */}
        {lowStock.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-700 dark:text-red-400">Low Stock Alert!</p>
              <p className="text-sm text-red-600/80 mt-1">
                {lowStock.map(i => `${i.name} (${i.currentStock} ${i.unit})`).join(', ')} — below threshold
              </p>
            </div>
          </motion.div>
        )}

        {/* Type Filter */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[{ label: 'All', value: '' }, ...TYPES.map(t => ({ label: t.charAt(0).toUpperCase() + t.slice(1), value: t }))].map(tab => (
            <button key={tab.value} onClick={() => setActiveType(tab.value)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all capitalize ${activeType === tab.value ? 'bg-orange-500 text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Inventory Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array(8).fill(0).map((_, i) => <div key={i} className="h-36 bg-muted rounded-2xl animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {inventory.map((item, i) => {
              const isLow = item.currentStock <= item.threshold
              return (
                <motion.div key={item._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className={`bg-card border rounded-2xl p-5 hover:shadow-md transition-all ${isLow ? 'border-red-300 dark:border-red-700' : 'border-border'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold capitalize ${TYPE_COLOR[item.ingredientType] || 'bg-gray-100 text-gray-600'}`}>{item.ingredientType}</span>
                    {isLow && <AlertTriangle className="w-4 h-4 text-red-500" />}
                  </div>
                  <h3 className="font-semibold text-foreground mb-3">{item.name}</h3>
                  <div className="mb-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span className={`font-bold ${isLow ? 'text-red-500' : 'text-foreground'}`}>{item.currentStock} {item.unit}</span>
                      <span className="text-muted-foreground text-xs">Min: {item.threshold}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className={`h-2 rounded-full transition-all ${isLow ? 'bg-red-500' : getStockLevel(item) < 50 ? 'bg-yellow-500' : 'bg-green-500'}`}
                        style={{ width: `${getStockLevel(item)}%` }} />
                    </div>
                  </div>
                  <button onClick={() => { setShowStockModal(item); setStockUpdate({ action: 'add', quantity: '', reason: '' }) }}
                    className="w-full py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted hover:border-orange-300 transition-all flex items-center justify-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5" /> Update Stock
                  </button>
                </motion.div>
              )
            })}
            {inventory.length === 0 && <p className="col-span-4 text-center text-muted-foreground py-12">No inventory items found</p>}
          </div>
        )}

        {/* Add Item Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl">
              <h2 className="font-bold text-xl mb-5">Add Inventory Item</h2>
              <form onSubmit={handleAddItem} className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Type</label>
                  <select value={form.ingredientType} onChange={e => setForm(f => ({ ...f, ingredientType: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-orange-500">
                    {TYPES.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
                  </select>
                </div>
                {[['name', 'Ingredient Name', 'text'], ['currentStock', 'Current Stock', 'number'], ['threshold', 'Low Stock Threshold', 'number'], ['pricePerUnit', 'Price Per Unit (₹)', 'number']].map(([k, l, t]) => (
                  <div key={k}>
                    <label className="text-sm font-medium mb-1.5 block">{l}</label>
                    <input type={t} value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-orange-500" />
                  </div>
                ))}
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Unit</label>
                  <select value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-orange-500">
                    {['kg', 'g', 'pieces', 'liters'].map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div className="flex gap-3">
                  <button type="submit" disabled={submitting} className="flex-1 py-3 rounded-xl bg-orange-500 text-white font-semibold disabled:opacity-60">Add Item</button>
                  <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-3 rounded-xl border border-border font-semibold">Cancel</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Update Stock Modal */}
        {showStockModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm shadow-2xl">
              <h2 className="font-bold text-xl mb-1">Update Stock</h2>
              <p className="text-muted-foreground text-sm mb-5">{showStockModal.name} — Current: {showStockModal.currentStock} {showStockModal.unit}</p>
              <form onSubmit={handleUpdateStock} className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Action</label>
                  <div className="flex gap-2">
                    {[['add', 'Add Stock'], ['deduct', 'Deduct'], ['adjust', 'Set Exact']].map(([v, l]) => (
                      <button key={v} type="button" onClick={() => setStockUpdate(s => ({ ...s, action: v }))}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${stockUpdate.action === v ? 'bg-orange-500 text-white border-orange-500' : 'border-border hover:border-orange-300'}`}>{l}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Quantity ({showStockModal.unit})</label>
                  <input type="number" value={stockUpdate.quantity} onChange={e => setStockUpdate(s => ({ ...s, quantity: e.target.value }))} min="0"
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Reason (optional)</label>
                  <input value={stockUpdate.reason} onChange={e => setStockUpdate(s => ({ ...s, reason: e.target.value }))} placeholder="e.g. New delivery"
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
                <div className="flex gap-3">
                  <button type="submit" disabled={submitting} className="flex-1 py-3 rounded-xl bg-orange-500 text-white font-semibold disabled:opacity-60">Update</button>
                  <button type="button" onClick={() => setShowStockModal(null)} className="flex-1 py-3 rounded-xl border border-border font-semibold">Cancel</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
