import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit, Trash2, Ticket, Percent, TrendingUp, DollarSign, Users, Calendar, Activity, X } from 'lucide-react';
import AdminLayout from '../../components/layout/AdminLayout';
import {
  getAllCouponsAdmin,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  toggleCouponStatus,
  getCouponAnalytics
} from '../../api/coupon';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function CouponManagement() {
  const [coupons, setCoupons] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [tab, setTab] = useState('list'); // 'list' | 'history' | 'analytics'

  // Form states
  const [formData, setFormData] = useState({
    title: '',
    code: '',
    description: '',
    discountType: 'percentage',
    discountValue: 0,
    maxDiscount: '',
    minCartValue: 0,
    minLifetimeSpending: 0,
    expiryDate: '',
    usageLimit: '',
    usagePerUser: 1,
    terms: '',
    isActive: true,
    isFirstOrderOnly: false,
    isWeekendOnly: false,
    isPremiumOnly: false
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [listRes, analRes] = await Promise.all([
        getAllCouponsAdmin(),
        getCouponAnalytics()
      ]);
      if (listRes.data.success) {
        setCoupons(listRes.data.data.coupons);
      }
      if (analRes.data.success) {
        setAnalytics(analRes.data.data);
      }
    } catch (err) {
      toast.error('Failed to load coupon configurations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleActive = async (id) => {
    try {
      const res = await toggleCouponStatus(id);
      if (res.data.success) {
        toast.success(res.data.message);
        setCoupons(coupons.map(c => c._id === id ? { ...c, isActive: !c.isActive } : c));
        // Refresh analytics
        const analRes = await getCouponAnalytics();
        if (analRes.data.success) setAnalytics(analRes.data.data);
      }
    } catch (err) {
      toast.error('Failed to update coupon status.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this coupon? This action cannot be undone.')) return;
    try {
      const res = await deleteCoupon(id);
      if (res.data.success) {
        toast.success(res.data.message);
        loadData();
      }
    } catch (err) {
      toast.error('Failed to delete coupon.');
    }
  };

  const handleOpenCreate = () => {
    setEditingCoupon(null);
    setFormData({
      title: '',
      code: '',
      description: '',
      discountType: 'percentage',
      discountValue: 0,
      maxDiscount: '',
      minCartValue: 0,
      minLifetimeSpending: 0,
      expiryDate: '',
      usageLimit: '',
      usagePerUser: 1,
      terms: '',
      isActive: true,
      isFirstOrderOnly: false,
      isWeekendOnly: false,
      isPremiumOnly: false
    });
    setShowModal(true);
  };

  const handleOpenEdit = (coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      title: coupon.title || '',
      code: coupon.code || '',
      description: coupon.description || '',
      discountType: coupon.discountType || 'percentage',
      discountValue: coupon.discountValue || 0,
      maxDiscount: coupon.maxDiscount || '',
      minCartValue: coupon.minCartValue || 0,
      minLifetimeSpending: coupon.minLifetimeSpending || 0,
      expiryDate: coupon.expiryDate ? new Date(coupon.expiryDate).toISOString().split('T')[0] : '',
      usageLimit: coupon.usageLimit || '',
      usagePerUser: coupon.usagePerUser || 1,
      terms: Array.isArray(coupon.terms) ? coupon.terms.join('\n') : '',
      isActive: coupon.isActive !== undefined ? coupon.isActive : true,
      isFirstOrderOnly: coupon.isFirstOrderOnly || false,
      isWeekendOnly: coupon.isWeekendOnly || false,
      isPremiumOnly: coupon.isPremiumOnly || false
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title || !formData.code || !formData.description || !formData.expiryDate) {
      toast.error('Please fill in all required fields.');
      return;
    }

    const payload = {
      ...formData,
      discountValue: Number(formData.discountValue),
      maxDiscount: formData.maxDiscount ? Number(formData.maxDiscount) : null,
      minCartValue: Number(formData.minCartValue),
      minLifetimeSpending: Number(formData.minLifetimeSpending),
      usageLimit: formData.usageLimit ? Number(formData.usageLimit) : null,
      usagePerUser: Number(formData.usagePerUser)
    };

    try {
      let res;
      if (editingCoupon) {
        res = await updateCoupon(editingCoupon._id, payload);
      } else {
        res = await createCoupon(payload);
      }

      if (res.data.success) {
        toast.success(res.data.message);
        setShowModal(false);
        loadData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save coupon.');
    }
  };

  const getTopCoupon = () => {
    if (!analytics || !analytics.couponStats || analytics.couponStats.length === 0) return 'None';
    return analytics.couponStats[0]._id;
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  const chartColors = ['#f97316', '#3b82f6', '#8b5cf6', '#10b981', '#ef4444', '#f59e0b'];

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-800 dark:text-gray-100 transition-colors duration-300">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-gray-900 dark:text-white">Coupon Management</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Configure pizza discounts, customer loyalty rules, and track promo success.</p>
          </div>
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center justify-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-4 py-2.5 rounded-xl transition-all duration-200 shadow-lg shadow-orange-500/25 self-start sm:self-center"
          >
            <Plus size={18} /> Create Coupon
          </button>
        </div>

        {/* Tabs Selection */}
        <div className="flex border-b border-gray-200 dark:border-gray-800 mb-6">
          <button
            onClick={() => setTab('list')}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === 'list'
                ? 'border-orange-500 text-orange-500'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            Coupons List
          </button>
          <button
            onClick={() => setTab('analytics')}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === 'analytics'
                ? 'border-orange-500 text-orange-500'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            Analytics & Reports
          </button>
          <button
            onClick={() => setTab('history')}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === 'history'
                ? 'border-orange-500 text-orange-500'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            Usage History
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-24">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
          </div>
        ) : (
          <>
            {/* 1. COUPON LIST TAB */}
            {tab === 'list' && (
              <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 font-semibold border-b border-gray-100 dark:border-gray-800">
                        <th className="px-6 py-4">Title & Description</th>
                        <th className="px-6 py-4">Code</th>
                        <th className="px-6 py-4">Discount Details</th>
                        <th className="px-6 py-4">Constraints</th>
                        <th className="px-6 py-4">Claims</th>
                        <th className="px-6 py-4">Expiry Date</th>
                        <th className="px-6 py-4">Active</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {coupons.map((coupon) => {
                        const isExpired = new Date(coupon.expiryDate) < new Date();
                        return (
                          <tr key={coupon._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-850/20 transition-colors">
                            <td className="px-6 py-4 max-w-xs">
                              <p className="font-bold text-gray-900 dark:text-white">{coupon.title}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{coupon.description}</p>
                            </td>
                            <td className="px-6 py-4">
                              <span className="font-mono font-bold bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 px-2.5 py-1 rounded-lg border border-orange-100 dark:border-orange-900/50">
                                {coupon.code}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <p className="font-bold">
                                {coupon.discountType === 'percentage'
                                  ? `${coupon.discountValue}% OFF`
                                  : formatCurrency(coupon.discountValue)}
                              </p>
                              {coupon.maxDiscount && (
                                <p className="text-[11px] text-gray-500">Max discount: {formatCurrency(coupon.maxDiscount)}</p>
                              )}
                            </td>
                            <td className="px-6 py-4 space-y-1 text-xs text-gray-600 dark:text-gray-400">
                              {coupon.minCartValue > 0 && <p>Min order: {formatCurrency(coupon.minCartValue)}</p>}
                              {coupon.minLifetimeSpending > 0 && <p>Min total spend: {formatCurrency(coupon.minLifetimeSpending)}</p>}
                              <div className="flex flex-wrap gap-1 mt-1">
                                {coupon.isFirstOrderOnly && (
                                  <span className="bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider border border-orange-200 dark:border-orange-900/50">First Order</span>
                                )}
                                {coupon.isWeekendOnly && (
                                  <span className="bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider border border-blue-200 dark:border-blue-900/50">Weekend</span>
                                )}
                                {coupon.isPremiumOnly && (
                                  <span className="bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider border border-purple-200 dark:border-purple-900/50">Premium</span>
                                )}
                              </div>
                              {coupon.minCartValue === 0 && coupon.minLifetimeSpending === 0 && !coupon.isFirstOrderOnly && !coupon.isWeekendOnly && !coupon.isPremiumOnly && <p className="text-gray-400 italic">None</p>}
                            </td>
                            <td className="px-6 py-4">
                              <p className="font-semibold text-gray-900 dark:text-white">
                                {coupon.usedCount}
                                {coupon.usageLimit ? (
                                  <span className="text-xs text-gray-400 font-medium"> / {coupon.usageLimit}</span>
                                ) : (
                                  <span className="text-xs text-gray-400 font-medium"> usages</span>
                                )}
                              </p>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`text-xs font-semibold ${isExpired ? 'text-red-500' : 'text-gray-600 dark:text-gray-400'}`}>
                                {new Date(coupon.expiryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                {isExpired && ' (Expired)'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <button
                                onClick={() => handleToggleActive(coupon._id)}
                                className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 ease-in-out relative flex items-center ${
                                  coupon.isActive ? 'bg-orange-500 justify-end' : 'bg-gray-200 dark:bg-gray-800 justify-start'
                                }`}
                              >
                                <span className="w-5 h-5 rounded-full bg-white shadow-sm transition-transform"></span>
                              </button>
                            </td>
                            <td className="px-6 py-4 text-right space-x-1">
                              <button
                                onClick={() => handleOpenEdit(coupon)}
                                className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-xl transition-colors"
                                title="Edit"
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                onClick={() => handleDelete(coupon._id)}
                                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-colors"
                                title="Delete"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {coupons.length === 0 && (
                        <tr>
                          <td colSpan={8} className="py-12 text-center text-gray-500 dark:text-gray-400">
                            <Ticket className="mx-auto w-12 h-12 text-gray-300 mb-3" />
                            No coupons created yet. Click "Create Coupon" to add your first promotion.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 2. ANALYTICS TAB */}
            {tab === 'analytics' && analytics && (
              <div className="space-y-8">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-12 h-12 bg-orange-50 dark:bg-orange-950/30 rounded-xl flex items-center justify-center text-orange-500">
                        <Activity size={24} />
                      </div>
                    </div>
                    <p className="text-3xl font-display font-bold text-gray-900 dark:text-white">{analytics.totalUsage}</p>
                    <p className="text-sm text-gray-500 mt-1">Total Coupon Usages</p>
                  </div>

                  <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-12 h-12 bg-blue-50 dark:bg-blue-950/30 rounded-xl flex items-center justify-center text-blue-500">
                        <Percent size={24} />
                      </div>
                    </div>
                    <p className="text-3xl font-display font-bold text-gray-900 dark:text-white">{getTopCoupon()}</p>
                    <p className="text-sm text-gray-500 mt-1">Most Used Coupon</p>
                  </div>

                  <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-12 h-12 bg-green-50 dark:bg-green-950/30 rounded-xl flex items-center justify-center text-green-500">
                        <DollarSign size={24} />
                      </div>
                    </div>
                    <p className="text-3xl font-display font-bold text-gray-900 dark:text-white">{formatCurrency(analytics.totalDiscount)}</p>
                    <p className="text-sm text-gray-500 mt-1">Total Discount Given</p>
                  </div>

                  <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-12 h-12 bg-purple-50 dark:bg-purple-950/30 rounded-xl flex items-center justify-center text-purple-500">
                        <Users size={24} />
                      </div>
                    </div>
                    <p className="text-3xl font-display font-bold text-gray-900 dark:text-white">{analytics.uniqueUsersCount}</p>
                    <p className="text-sm text-gray-500 mt-1">Customer Engagement</p>
                  </div>
                </div>

                {/* Additional Stats Box */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Chart */}
                  <div className="lg:col-span-2 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                    <div>
                      <h3 className="font-display font-bold text-lg text-gray-900 dark:text-white mb-2">Coupon Performance</h3>
                      <p className="text-xs text-gray-400 mb-6">Usages per coupon code applied in final checkouts.</p>
                    </div>
                    <div className="h-64">
                      {analytics.couponStats?.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={analytics.couponStats}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="_id" tick={{ fill: 'gray', fontSize: 12 }} />
                            <YAxis tick={{ fill: 'gray', fontSize: 12 }} />
                            <Tooltip contentStyle={{ background: '#1f2937', color: '#fff', borderRadius: '8px' }} />
                            <Bar dataKey="usageCount" radius={[6, 6, 0, 0]}>
                              {analytics.couponStats.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-gray-400">No data found</div>
                      )}
                    </div>
                  </div>

                  {/* Revenue impact info panel */}
                  <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl p-6 text-white shadow-md flex flex-col justify-between">
                    <div>
                      <span className="bg-white/20 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                        Business Impact
                      </span>
                      <h3 className="text-2xl font-bold font-display mt-4">Sales Driven by Promos</h3>
                      <p className="text-white/80 text-sm mt-2">
                        Total sales orders completed where a coupon code was applied. Coupons directly incentivize cart checkouts!
                      </p>
                    </div>
                    <div className="mt-8">
                      <p className="text-sm uppercase tracking-wider text-white/70">Associated Revenue</p>
                      <p className="text-5xl font-display font-extrabold mt-1">{formatCurrency(analytics.revenueImpact)}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. HISTORY TAB */}
            {tab === 'history' && analytics && (
              <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 font-semibold border-b border-gray-100 dark:border-gray-800">
                        <th className="px-6 py-4">Order Number</th>
                        <th className="px-6 py-4">Customer Details</th>
                        <th className="px-6 py-4">Coupon Applied</th>
                        <th className="px-6 py-4">Discount Given</th>
                        <th className="px-6 py-4">Final Amount</th>
                        <th className="px-6 py-4">Applied Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {analytics.recentUsage?.map((usage, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-gray-850/20 transition-colors">
                          <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">#{usage.orderNumber}</td>
                          <td className="px-6 py-4">
                            <p className="font-semibold text-gray-900 dark:text-white">{usage.customerName}</p>
                            <p className="text-xs text-gray-500">{usage.customerEmail}</p>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-mono font-bold bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded border border-orange-100 dark:border-orange-900/50">
                              {usage.couponCode}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-semibold text-green-500">-{formatCurrency(usage.discountAmount)}</td>
                          <td className="px-6 py-4 font-bold">{formatCurrency(usage.finalAmount)}</td>
                          <td className="px-6 py-4 text-xs text-gray-500">
                            {new Date(usage.createdAt).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </td>
                        </tr>
                      ))}
                      {(!analytics.recentUsage || analytics.recentUsage.length === 0) && (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-gray-500">
                            No coupon application history found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {/* 4. CRUD MODAL OVERLAY */}
        <AnimatePresence>
          {showModal && (
            <div 
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto"
              onClick={() => setShowModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden my-8"
              >
                {/* Modal Title */}
                <div className="flex justify-between items-center px-6 py-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/30">
                  <div className="flex items-center gap-2">
                    <Ticket className="text-orange-500" />
                    <h3 className="text-lg font-bold font-display text-gray-900 dark:text-white">
                      {editingCoupon ? `Edit Coupon: ${editingCoupon.code}` : 'Create New Coupon'}
                    </h3>
                  </div>
                  <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                    <X size={20} />
                  </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="px-6 py-6 space-y-5 max-h-[70vh] overflow-y-auto">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Title */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Coupon Title*</label>
                      <input
                        type="text"
                        placeholder="e.g. VIP Loyalty Discount"
                        value={formData.title}
                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                        className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-850 px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:border-orange-500"
                        required
                      />
                    </div>
                    {/* Code */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Coupon Code*</label>
                      <input
                        type="text"
                        placeholder="e.g. VIP10"
                        value={formData.code}
                        onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                        className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-850 px-3.5 py-2.5 rounded-xl text-sm font-mono font-bold focus:outline-none focus:border-orange-500"
                        required
                        disabled={!!editingCoupon}
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Description*</label>
                    <textarea
                      placeholder="Explain what the coupon gives, e.g., 10% off up to ₹150 on your order."
                      value={formData.description}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                      className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-850 px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:border-orange-500 h-20"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Discount Type */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Discount Type</label>
                      <select
                        value={formData.discountType}
                        onChange={e => setFormData({ ...formData, discountType: e.target.value })}
                        className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-850 px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:border-orange-500"
                      >
                        <option value="percentage">Percentage (%)</option>
                        <option value="fixed">Fixed Flat (₹)</option>
                      </select>
                    </div>
                    {/* Discount Value */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Value*</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="e.g. 10 or 150"
                        value={formData.discountValue}
                        onChange={e => setFormData({ ...formData, discountValue: e.target.value })}
                        className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-850 px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:border-orange-500 font-bold"
                        required
                      />
                    </div>
                    {/* Max Discount */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Max Discount Cap (₹)</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="e.g. 150 (Leave blank for flat)"
                        value={formData.maxDiscount}
                        onChange={e => setFormData({ ...formData, maxDiscount: e.target.value })}
                        className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-850 px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:border-orange-500"
                        disabled={formData.discountType === 'fixed'}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Min Cart Value */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Min Order Cart Value (₹)*</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="e.g. 0 (Minimum 0)"
                        value={formData.minCartValue}
                        onChange={e => setFormData({ ...formData, minCartValue: e.target.value })}
                        className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-850 px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:border-orange-500"
                        required
                      />
                    </div>
                    {/* Min Lifetime Spending */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Min User Lifetime Spending (₹)</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="e.g. 5000 (For loyalty tiers)"
                        value={formData.minLifetimeSpending}
                        onChange={e => setFormData({ ...formData, minLifetimeSpending: e.target.value })}
                        className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-850 px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:border-orange-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Expiry Date */}
                    <div className="sm:col-span-1">
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Expiry Date*</label>
                      <input
                        type="date"
                        value={formData.expiryDate}
                        onChange={e => setFormData({ ...formData, expiryDate: e.target.value })}
                        className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-850 px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:border-orange-500"
                        required
                      />
                    </div>
                    {/* Usage Limit */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Max Total Usages</label>
                      <input
                        type="number"
                        min="1"
                        placeholder="e.g. 500 (Blank for infinite)"
                        value={formData.usageLimit}
                        onChange={e => setFormData({ ...formData, usageLimit: e.target.value })}
                        className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-850 px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:border-orange-500"
                      />
                    </div>
                    {/* Usage Per User */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Limit Per User</label>
                      <input
                        type="number"
                        min="1"
                        placeholder="e.g. 1"
                        value={formData.usagePerUser}
                        onChange={e => setFormData({ ...formData, usagePerUser: e.target.value })}
                        className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-850 px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:border-orange-500"
                      />
                    </div>
                  </div>

                  {/* Terms & Conditions */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Terms & Conditions (One per line)</label>
                    <textarea
                      placeholder="e.g. Valid only on medium or large size pizzas.&#10;Single use per month."
                      value={formData.terms}
                      onChange={e => setFormData({ ...formData, terms: e.target.value })}
                      className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-850 px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:border-orange-500 h-24"
                    />
                  </div>

                  {/* Usage Restrictions */}
                  <div className="border-t border-gray-150 dark:border-gray-800 pt-4 space-y-3">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Usage Restrictions</h4>
                    <div className="flex flex-wrap gap-x-6 gap-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="isFirstOrderOnly"
                          checked={formData.isFirstOrderOnly}
                          onChange={e => setFormData({ ...formData, isFirstOrderOnly: e.target.checked })}
                          className="accent-orange-500 h-4 w-4 rounded"
                        />
                        <label htmlFor="isFirstOrderOnly" className="text-xs font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">
                          First Order Only
                        </label>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="isWeekendOnly"
                          checked={formData.isWeekendOnly}
                          onChange={e => setFormData({ ...formData, isWeekendOnly: e.target.checked })}
                          className="accent-orange-500 h-4 w-4 rounded"
                        />
                        <label htmlFor="isWeekendOnly" className="text-xs font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">
                          Weekend Only
                        </label>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="isPremiumOnly"
                          checked={formData.isPremiumOnly}
                          onChange={e => setFormData({ ...formData, isPremiumOnly: e.target.checked })}
                          className="accent-orange-500 h-4 w-4 rounded"
                        />
                        <label htmlFor="isPremiumOnly" className="text-xs font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">
                          Premium Pizzas Only
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Active Toggle */}
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={formData.isActive}
                      onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                      className="accent-orange-500 h-4 w-4 rounded"
                    />
                    <label htmlFor="isActive" className="text-sm font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">
                      Activate Coupon immediately
                    </label>
                  </div>

                  {/* Form Footer Buttons */}
                  <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/30 -mx-6 -mb-6 px-6 py-4">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-200 font-semibold px-4 py-2.5 rounded-xl text-xs transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-5 py-2.5 rounded-xl text-xs transition-colors shadow-lg shadow-orange-500/25"
                    >
                      {editingCoupon ? 'Save Changes' : 'Create Coupon'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </AdminLayout>
  );
}
