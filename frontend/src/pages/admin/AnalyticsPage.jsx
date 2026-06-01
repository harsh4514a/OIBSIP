import { useEffect, useState } from 'react'
import AdminLayout from '../../components/layout/AdminLayout'
import { getSalesAnalytics, getOrderStatusChart, getTopPizzas } from '../../api/admin'
import { formatCurrency } from '../../lib/utils'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { motion } from 'framer-motion'

const COLORS = ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#f59e0b', '#14b8a6']

export default function AnalyticsPage() {
  const [salesData, setSalesData] = useState([])
  const [statusData, setStatusData] = useState([])
  const [topPizzas, setTopPizzas] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [salesRes, statusRes, pizzaRes] = await Promise.all([getSalesAnalytics(), getOrderStatusChart(), getTopPizzas()])
        setSalesData(salesRes.data.data?.analytics || [])
        setStatusData(statusRes.data.data?.chart || [])
        setTopPizzas(pizzaRes.data.data?.topPizzas || [])
      } catch {} finally { setLoading(false) }
    }
    fetchAll()
  }, [])

  const totalRevenue = salesData.reduce((s, d) => s + (d.revenue || 0), 0)
  const totalOrders = salesData.reduce((s, d) => s + (d.orders || 0), 0)

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-display font-bold text-foreground">Sales Analytics</h1>
          <p className="text-muted-foreground mt-1">Last 12 months performance overview</p>
        </motion.div>

        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          {[
            { label: 'Total Revenue (12m)', value: formatCurrency(totalRevenue), color: 'from-orange-400 to-orange-600' },
            { label: 'Total Orders (12m)', value: totalOrders.toLocaleString(), color: 'from-blue-400 to-blue-600' },
            { label: 'Avg Order Value', value: totalOrders ? formatCurrency(Math.round(totalRevenue / totalOrders)) : '₹0', color: 'from-green-400 to-green-600' },
          ].map(({ label, value, color }) => (
            <motion.div key={label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`bg-gradient-to-br ${color} rounded-2xl p-6 text-white`}>
              <p className="text-white/80 text-sm mb-2">{label}</p>
              <p className="text-3xl font-display font-bold">{loading ? '—' : value}</p>
            </motion.div>
          ))}
        </div>

        {/* Monthly Revenue Line Chart */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-card border border-border rounded-2xl p-6 mb-6">
          <h2 className="font-display font-bold text-lg text-foreground mb-6">Monthly Revenue & Orders</h2>
          {loading ? <div className="h-72 bg-muted rounded-xl animate-pulse" /> : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px' }}
                  formatter={(v, n) => [n === 'revenue' ? formatCurrency(v) : v, n === 'revenue' ? 'Revenue' : 'Orders']} />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#f97316" strokeWidth={2.5} dot={{ fill: '#f97316', r: 4 }} name="Revenue" />
                <Line yAxisId="right" type="monotone" dataKey="orders" stroke="#3b82f6" strokeWidth={2.5} dot={{ fill: '#3b82f6', r: 4 }} name="Orders" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Order Status Pie */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="bg-card border border-border rounded-2xl p-6">
            <h2 className="font-display font-bold text-lg text-foreground mb-6">Orders by Status</h2>
            {loading ? (
              <div className="h-56 bg-muted rounded-xl animate-pulse" />
            ) : statusData.filter((d) => d.count > 0).length === 0 ? (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
                No orders recorded yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={statusData.filter((d) => d.count > 0)}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="count"
                    nameKey="status"
                    label={({ name, percent }) => `${name && typeof name === 'string' ? name.replace(/-/g, ' ') : String(name || '')} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {statusData.filter((d) => d.count > 0).map((entry, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v, typeof n === 'string' ? n.replace(/-/g, ' ') : String(n)]} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </motion.div>

          {/* Top Pizzas Bar */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="bg-card border border-border rounded-2xl p-6">
            <h2 className="font-display font-bold text-lg text-foreground mb-6">Top Selling Pizzas</h2>
            {loading ? (
              <div className="h-56 bg-muted rounded-xl animate-pulse" />
            ) : topPizzas.length === 0 ? (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
                No pizza sales recorded yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={topPizzas.slice(0, 7)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px' }}
                    formatter={(v) => [v, 'Pizzas Sold']}
                  />
                  <Bar dataKey="totalOrdered" name="Pizzas Sold" fill="#f97316" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </motion.div>
        </div>
      </div>
    </AdminLayout>
  )
}
