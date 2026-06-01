import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Search, Eye } from 'lucide-react'
import AdminLayout from '../../components/layout/AdminLayout'
import { getAllOrdersAdmin, updateOrderStatus } from '../../api/order'
import { formatCurrency, formatDateTime } from '../../lib/utils'
import { useSocket } from '../../hooks/useSocket'
import toast from 'react-hot-toast'
import PizzaPreview from '../../components/pizza/PizzaPreview'

const STATUS_FLOW = ['pending', 'confirmed', 'preparing', 'out-for-delivery', 'delivered']
const STATUS_COLOR = {
  pending: 'bg-yellow-100 text-yellow-700', confirmed: 'bg-blue-100 text-blue-700',
  preparing: 'bg-orange-100 text-orange-700',
  'out-for-delivery': 'bg-purple-100 text-purple-700', delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-600',
}

export default function OrderManagement() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [updatingId, setUpdatingId] = useState(null)
  const { socket } = useSocket()

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const { data } = await getAllOrdersAdmin({ search, status: statusFilter, page, limit: 10 })
      setOrders(data.data?.orders || [])
      setTotalPages(data.data?.pagination?.pages || 1)
    } catch { toast.error('Failed') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchOrders() }, [search, statusFilter, page])

  const handleStatusChange = async (orderId, newStatus) => {
    setUpdatingId(orderId)
    try {
      const { data } = await updateOrderStatus(orderId, newStatus)
      setOrders(prev => prev.map(o => o._id === orderId ? { ...o, status: newStatus } : o))
      if (selectedOrder?._id === orderId) setSelectedOrder(o => ({ ...o, status: newStatus }))
      socket?.emit('order-status-update', { orderId, status: newStatus, statusHistory: data.data.statusHistory })
      toast.success(`Status updated to: ${newStatus.replace(/-/g, ' ')}`)
    } catch { toast.error('Failed') }
    finally { setUpdatingId(null) }
  }

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-foreground">Order Management</h1>
          <p className="text-muted-foreground mt-1">Manage and track all customer orders</p>
        </div>

        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Search orders..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
          </div>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
            className="px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-orange-500">
            <option value="">All Status</option>
            {[...STATUS_FLOW, 'cancelled'].map(s => <option key={s} value={s} className="capitalize">{s.replace(/-/g, ' ')}</option>)}
          </select>
        </div>

        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr className="text-left text-muted-foreground">
                  {['Order #', 'Customer', 'Items', 'Amount', 'Status', 'Date', 'Actions'].map(h => (
                    <th key={h} className="px-5 py-4 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? Array(5).fill(0).map((_, i) => (
                  <tr key={i}><td colSpan={7} className="px-5 py-4"><div className="h-8 bg-muted rounded animate-pulse" /></td></tr>
                )) : orders.length === 0 ? (
                  <tr><td colSpan={7} className="py-12 text-center text-muted-foreground">No orders found</td></tr>
                ) : orders.map(order => (
                  <tr key={order._id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-4 font-mono font-medium text-foreground">#{order.orderNumber}</td>
                    <td className="px-5 py-4">
                      <div>
                        <p className="font-medium text-foreground">{order.user?.name || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">{order.user?.email}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">{order.items?.length || 0} item(s)</td>
                    <td className="px-5 py-4">
                      <div className="font-semibold text-foreground">{formatCurrency(order.finalAmount)}</div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {order.paymentMethod === 'cod' ? (
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            order.paymentStatus === 'paid' ? 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400' : 'bg-gray-100 text-gray-700 dark:bg-gray-850 dark:text-gray-400'
                          }`}>
                            COD {order.paymentStatus === 'paid' && '· Paid'}
                          </span>
                        ) : (
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            order.paymentStatus === 'paid' ? 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400'
                          }`}>
                            {order.paymentStatus === 'paid' ? 'Paid' : 'Unpaid'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {order.status !== 'cancelled' ? (
                        <select value={order.status} disabled={updatingId === order._id}
                          onChange={e => handleStatusChange(order._id, e.target.value)}
                          className={`px-2 py-1 rounded-lg text-xs font-bold border-0 outline-none cursor-pointer capitalize ${STATUS_COLOR[order.status] || 'bg-gray-100 text-gray-600'}`}>
                          {STATUS_FLOW.map(s => <option key={s} value={s} className="capitalize bg-white text-gray-800">{s.replace(/-/g, ' ')}</option>)}
                        </select>
                      ) : (
                        <span className="px-2 py-1 rounded-lg text-xs font-bold bg-gray-100 text-gray-600">Cancelled</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-muted-foreground text-xs">{formatDateTime(order.createdAt)}</td>
                    <td className="px-5 py-4">
                      <button onClick={() => setSelectedOrder(order)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 transition-colors">
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="px-5 py-4 border-t border-border flex items-center justify-between">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 rounded-lg border border-border text-sm disabled:opacity-40">Previous</button>
              <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 rounded-lg border border-border text-sm disabled:opacity-40">Next</button>
            </div>
          )}
        </div>

        {/* Order Detail Modal */}
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelectedOrder(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="bg-card border border-border rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl"
              onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-bold text-lg">Order #{selectedOrder.orderNumber}</h2>
                <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold capitalize ${STATUS_COLOR[selectedOrder.status]}`}>{selectedOrder.status?.replace(/-/g, ' ')}</span>
              </div>
              <div className="space-y-3 mb-4">
                {selectedOrder.items?.map((item, i) => {
                  const isCustom = item.type === 'custom' || !!item.customPizza;
                  return (
                    <div key={i} className="flex gap-3 items-center">
                      <div className={`w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center ${isCustom ? 'bg-orange-50/50 dark:bg-orange-950/10 p-0.5' : 'bg-muted'}`}>
                        {isCustom ? (
                          <PizzaPreview
                            size={item.customizations?.size || item.size || 'medium'}
                            base={item.customizations?.base || 'thin'}
                            sauce={item.customizations?.sauce || 'tomato'}
                            cheese={item.customizations?.cheese || 'mozzarella'}
                            veggies={item.customizations?.veggies || []}
                            hideDetails={true}
                          />
                        ) : (
                          <img src={item.image || 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=200'} alt={item.name} className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.name}</p>
                        <p className="text-xs text-muted-foreground">Qty: {item.quantity} · {item.size}</p>
                      </div>
                      <span className="text-sm font-semibold">{formatCurrency(item.price * item.quantity)}</span>
                    </div>
                  )
                })}
              </div>
              <div className="border-t border-border pt-3 space-y-1.5 text-sm">
                <div className="flex justify-between font-bold text-base"><span>Total</span><span className="text-orange-500">{formatCurrency(selectedOrder.finalAmount)}</span></div>
                <div className="flex justify-between text-xs text-muted-foreground pt-1">
                  <span>Payment Method:</span>
                  <span className="font-semibold capitalize text-foreground">{selectedOrder.paymentMethod === 'cod' ? 'Cash on Delivery (COD)' : 'Online (Razorpay)'}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Payment Status:</span>
                  <span className={`font-semibold capitalize ${selectedOrder.paymentStatus === 'paid' ? 'text-green-600' : 'text-yellow-600'}`}>
                    {selectedOrder.paymentStatus}
                  </span>
                </div>
              </div>
               <div className="mt-4 p-3 bg-muted/50 rounded-xl text-sm">
                <p className="font-semibold mb-1">Customer</p>
                <p className="text-muted-foreground">{selectedOrder.user?.name || 'Unknown'} · {selectedOrder.user?.email}</p>
              </div>
              <div className="mt-3 p-3 bg-muted/50 rounded-xl text-sm">
                <p className="font-semibold mb-1">Delivery Address</p>
                <p className="text-muted-foreground">{selectedOrder.deliveryAddress?.street}, {selectedOrder.deliveryAddress?.city} - {selectedOrder.deliveryAddress?.pincode}</p>
                {selectedOrder.deliveryAddress?.phone && (
                  <p className="text-muted-foreground mt-1 flex items-center gap-1">
                    <span>📞 Contact:</span>
                    <span>{selectedOrder.deliveryAddress.phone}</span>
                  </p>
                )}
              </div>
              <button onClick={() => setSelectedOrder(null)} className="w-full mt-4 py-2.5 rounded-xl border border-border font-medium hover:bg-muted transition-colors">Close</button>
            </motion.div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
