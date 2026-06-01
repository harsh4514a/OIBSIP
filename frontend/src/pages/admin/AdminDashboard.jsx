import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, ShoppingBag, Users, DollarSign, Clock, IndianRupee } from 'lucide-react'
import AdminLayout from '../../components/layout/AdminLayout'
import { SkeletonCard } from '../../components/ui/Skeleton'
import { getDashboardStats, getRevenueChart, getOrderStatusChart, getTopPizzas, getRecentOrders } from '../../api/admin'
import { formatCurrency, formatDateTime } from '../../lib/utils'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'

const STATUS_COLOR = {
  pending: '#f59e0b', confirmed: '#3b82f6', preparing: '#f97316',
  'out-for-delivery': '#8b5cf6', delivered: '#10b981', cancelled: '#6b7280',
}

const STATUS_BADGE = {
  pending: 'bg-yellow-100 text-yellow-700', confirmed: 'bg-blue-100 text-blue-700',
  preparing: 'bg-orange-100 text-orange-700', delivered: 'bg-green-100 text-green-700', cancelled: 'bg-gray-100 text-gray-600',
}

const containerVariants = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }
const itemVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }

const StatCard = ({ title, value, change, icon: Icon, color, loading }) => {
  if (loading) return <div className="h-32 bg-muted rounded-2xl animate-pulse" />
  const isPositive = change >= 0
  return (
    <motion.div variants={itemVariants} className="bg-card border border-border rounded-2xl p-6">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div className={`flex items-center gap-1 text-sm font-medium ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
          {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          {Math.abs(change)}%
        </div>
      </div>
      <div className="text-3xl font-display font-bold text-foreground mb-1">{value}</div>
      <div className="text-muted-foreground text-sm">{title}</div>
    </motion.div>
  )
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [revenueData, setRevenueData] = useState([])
  const [orderStatusData, setOrderStatusData] = useState([])
  const [topPizzas, setTopPizzas] = useState([])
  const [recentOrders, setRecentOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [statsRes, revenueRes, statusRes, pizzasRes, ordersRes] = await Promise.all([
          getDashboardStats(), getRevenueChart(), getOrderStatusChart(), getTopPizzas(), getRecentOrders(),
        ])
        setStats(statsRes.data.data)
        setRevenueData(revenueRes.data.data?.chart || [])
        setOrderStatusData(statusRes.data.data?.chart || [])
        setTopPizzas(pizzasRes.data.data?.topPizzas || [])
        setRecentOrders(ordersRes.data.data?.orders || [])
      } catch {}
      finally { setLoading(false) }
    }
    fetchAll()
  }, [])

  const statCards = [
    { title: 'Total Revenue', value: stats ? formatCurrency(stats.revenue.total) : '—', change: 12.5, icon: IndianRupee, color: 'bg-gradient-to-br from-orange-400 to-orange-600' },
    { title: "Today's Orders", value: stats?.orders?.today ?? '—', change: 8.2, icon: ShoppingBag, color: 'bg-gradient-to-br from-blue-400 to-blue-600' },
    { title: 'Active Orders', value: stats?.orders?.active ?? '—', change: -2.1, icon: Clock, color: 'bg-gradient-to-br from-purple-400 to-purple-600' },
    { title: 'Total Users', value: stats?.users?.total ?? '—', change: 5.7, icon: Users, color: 'bg-gradient-to-br from-green-400 to-green-600' },
  ]

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-display font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Welcome back! Here's what's happening today.</p>
        </motion.div>

        {/* Stat Cards */}
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
          {statCards.map(card => <StatCard key={card.title} {...card} loading={loading} />)}
        </motion.div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
          {/* Revenue Chart */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="xl:col-span-2 bg-card border border-border rounded-2xl p-6">
            <h2 className="font-display font-bold text-lg text-foreground mb-6">Revenue (Last 30 Days)</h2>
            {loading ? <div className="h-64 bg-muted rounded-xl animate-pulse" /> : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => `₹${v}`} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px' }}
                    formatter={v => [`₹${v.toLocaleString()}`, 'Revenue']} />
                  <Area type="monotone" dataKey="revenue" stroke="#f97316" strokeWidth={2.5} fill="url(#revenueGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </motion.div>

          {/* Order Status Chart */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="bg-card border border-border rounded-2xl p-6">
            <h2 className="font-display font-bold text-lg text-foreground mb-6">Orders by Status</h2>
            {loading ? <div className="h-64 bg-muted rounded-xl animate-pulse" /> : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={orderStatusData} cx="50%" cy="45%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="count" nameKey="status">
                    {orderStatusData.map((entry) => (
                      <Cell key={entry.status} fill={STATUS_COLOR[entry.status] || '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v, n]} />
                  <Legend formatter={v => (typeof v === 'string' ? v.replace(/-/g, ' ') : String(v))} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </motion.div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Recent Orders */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
            className="xl:col-span-2 bg-card border border-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display font-bold text-lg text-foreground">Recent Orders</h2>
              <a href="/admin/orders" className="text-sm text-orange-500 hover:text-orange-600 font-medium">View all</a>
            </div>
            {loading ? <div className="space-y-3">{Array(5).fill(0).map((_, i) => <div key={i} className="h-12 bg-muted rounded-xl animate-pulse" />)}</div> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-muted-foreground text-left border-b border-border">
                      <th className="pb-3 font-medium">Order</th>
                      <th className="pb-3 font-medium">Customer</th>
                      <th className="pb-3 font-medium">Amount</th>
                      <th className="pb-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {recentOrders.map(order => (
                      <tr key={order._id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 font-medium text-foreground">#{order.orderNumber}</td>
                        <td className="py-3 text-muted-foreground">{order.user?.name || 'Unknown'}</td>
                        <td className="py-3 font-semibold">{formatCurrency(order.finalAmount)}</td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded-lg text-xs font-bold capitalize ${STATUS_BADGE[order.status] || 'bg-gray-100 text-gray-600'}`}>
                            {order.status?.replace(/-/g, ' ')}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {recentOrders.length === 0 && <tr><td colSpan={4} className="py-8 text-center text-muted-foreground">No orders yet</td></tr>}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>

          {/* Top Pizzas */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
            className="bg-card border border-border rounded-2xl p-6">
            <h2 className="font-display font-bold text-lg text-foreground mb-6">Top Pizzas</h2>
            {loading ? <div className="space-y-3">{Array(5).fill(0).map((_, i) => <div key={i} className="h-10 bg-muted rounded-xl animate-pulse" />)}</div> : (
              <div className="space-y-4">
                {topPizzas.slice(0, 7).map((pizza, i) => {
                  const maxOrders = topPizzas[0]?.orderCount || 1
                  return (
                    <div key={pizza._id} className="flex items-center gap-3">
                      <span className="text-muted-foreground text-sm w-5">#{i + 1}</span>
                      <img src={pizza.image || `https://picsum.photos/seed/${pizza._id}/40/40`} alt={pizza.name} className="w-9 h-9 rounded-lg object-cover bg-muted flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{pizza.name}</p>
                        <div className="w-full bg-muted rounded-full h-1.5 mt-1">
                          <div className="bg-orange-500 h-1.5 rounded-full" style={{ width: `${(pizza.orderCount / maxOrders) * 100}%` }} />
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground flex-shrink-0">{pizza.orderCount}</span>
                    </div>
                  )
                })}
                {topPizzas.length === 0 && <p className="text-muted-foreground text-center py-4">No data</p>}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </AdminLayout>
  )
}
