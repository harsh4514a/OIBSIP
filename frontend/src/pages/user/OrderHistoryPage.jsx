import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Package, MapPin, Download, XCircle, ExternalLink, Star, CheckCircle2 } from 'lucide-react'
import Navbar from '../../components/layout/Navbar'
import Footer from '../../components/layout/Footer'
import EmptyState from '../../components/ui/EmptyState'
import Pagination from '../../components/ui/Pagination'
import Modal from '../../components/ui/Modal'
import StarRating from '../../components/ui/StarRating'
import { getUserOrders, cancelOrder, downloadInvoice } from '../../api/order'
import { createReview, getOrderReviews, deleteReview } from '../../api/review'
import { formatCurrency, formatDateTime, cn } from '../../lib/utils'
import toast from 'react-hot-toast'
import PizzaPreview from '../../components/pizza/PizzaPreview'

const STATUS_COLOR = {
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  confirmed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  preparing: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  'out-for-delivery': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  delivered: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  cancelled: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
}

export default function OrderHistoryPage() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')

  // Review states
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [selectedPizza, setSelectedPizza] = useState(null)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)
  const [orderReviews, setOrderReviews] = useState([])
  const [loadingReviews, setLoadingReviews] = useState(false)
  const [deletingReview, setDeletingReview] = useState(false)
  const [ordersReviewsMap, setOrdersReviewsMap] = useState({})

  // Derived review states
  const reviewedPizzaIds = new Set(orderReviews.filter(r => r.pizza).map(r => (r.pizza?._id || r.pizza).toString()))

  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      try {
        const { data } = await getUserOrders({ page, limit: 5, status: statusFilter })
        setOrders(data.data?.orders || [])
        setTotalPages(data.data?.pagination?.pages || 1)
      } catch { setOrders([]) }
      finally { setLoading(false) }
    }
    fetch()
  }, [page, statusFilter])

  // Fetch reviews for all loaded orders to determine review status badge upfront
  useEffect(() => {
    const fetchAllOrdersReviews = async () => {
      if (orders.length === 0) return
      try {
        const promises = orders.map(o => getOrderReviews(o._id))
        const results = await Promise.all(promises)
        const newMap = {}
        results.forEach((res, index) => {
          const orderId = orders[index]._id
          newMap[orderId] = res.data.data?.reviews || []
        })
        setOrdersReviewsMap(newMap)
      } catch (err) {
        console.error('Failed to fetch reviews for history orders:', err)
      }
    }
    fetchAllOrdersReviews()
  }, [orders])

  const isOrderFullyReviewed = (order) => {
    const reviews = ordersReviewsMap[order._id] || []
    const reviewedPizzaIdsSet = new Set(reviews.filter(r => r.pizza).map(r => (r.pizza?._id || r.pizza).toString()))
    const reviewableItems = order.items?.filter(item => item.pizza) || []
    if (reviewableItems.length === 0) return false
    return reviewableItems.every(item => reviewedPizzaIdsSet.has((item.pizza?._id || item.pizza).toString()))
  }

  const handleCancel = async (orderId) => {
    if (!confirm('Cancel this order?')) return
    try {
      await cancelOrder(orderId)
      setOrders(prev => prev.map(o => o._id === orderId ? { ...o, status: 'cancelled' } : o))
      toast.success('Order cancelled')
    } catch (err) { toast.error(err.response?.data?.message || 'Cannot cancel this order') }
  }

  const handleDownloadInvoice = async (orderId, orderNumber) => {
    try {
      const response = await downloadInvoice(orderId)
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Invoice-${orderNumber}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch { toast.error('Failed to download invoice') }
  }

  const handleOpenReviewModal = async (order) => {
    setSelectedOrder(order)
    setIsReviewModalOpen(true)
    setLoadingReviews(true)
    setOrderReviews([])
    
    // Reset inputs
    setRating(5)
    setComment('')
    setSelectedPizza(null)

    try {
      const { data } = await getOrderReviews(order._id)
      const reviews = data.data?.reviews || []
      setOrderReviews(reviews)

      const reviewedIds = new Set(reviews.filter(r => r.pizza).map(r => (r.pizza?._id || r.pizza).toString()))

      // Auto-select first unreviewed item
      const reviewable = order.items?.filter(item => item.pizza) || []
      const firstUnreviewedPizza = reviewable.find(item => !reviewedIds.has((item.pizza?._id || item.pizza).toString()))
      
      if (firstUnreviewedPizza) {
        setSelectedPizza(firstUnreviewedPizza)
      } else {
        // Show first pizza's review
        setSelectedPizza(reviewable[0] || null)
      }
    } catch {
      toast.error('Failed to load existing reviews')
      const reviewable = order.items?.filter(item => item.pizza) || []
      setSelectedPizza(reviewable[0] || null)
    } finally {
      setLoadingReviews(false)
    }
  }

  const handleReviewSubmit = async (e) => {
    e.preventDefault()
    if (!selectedOrder) return
    if (!comment.trim()) return toast.error('Please write a comment')

    setSubmittingReview(true)
    try {
      if (!selectedPizza) return
      const res = await createReview({
        orderId: selectedOrder._id,
        pizzaId: selectedPizza.pizza,
        rating,
        comment,
      })
      toast.success(`Review for ${selectedPizza.name} submitted successfully!`)

      const newReview = res.data?.data?.review
      let updatedReviews = orderReviews
      if (newReview) {
        updatedReviews = [...orderReviews, newReview]
        setOrderReviews(updatedReviews)
      }

      setOrdersReviewsMap(prev => ({
        ...prev,
        [selectedOrder._id]: updatedReviews
      }))

      setComment('')

      // Auto-advance
      const reviewable = selectedOrder?.items?.filter(item => item.pizza) || []
      const nextReviewedIds = new Set(updatedReviews.filter(r => r.pizza).map(r => (r.pizza?._id || r.pizza).toString()))

      const nextUnreviewedPizza = reviewable.find(item => !nextReviewedIds.has((item.pizza?._id || item.pizza).toString()))
      
      if (nextUnreviewedPizza) {
        setSelectedPizza(nextUnreviewedPizza)
        setRating(5)
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Failed to submit review'
      toast.error(errMsg)
    } finally {
      setSubmittingReview(false)
    }
  }

  const handleReviewDelete = async (reviewId) => {
    if (!confirm('Are you sure you want to delete this review?')) return
    setDeletingReview(true)
    try {
      await deleteReview(reviewId)
      toast.success('Review deleted successfully')
      
      const updatedReviews = orderReviews.filter(r => r._id !== reviewId)
      setOrderReviews(updatedReviews)

      setOrdersReviewsMap(prev => ({
        ...prev,
        [selectedOrder._id]: updatedReviews
      }))
      
      // Reset inputs
      setRating(5)
      setComment('')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete review')
    } finally {
      setDeletingReview(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-8">
            <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3"><Package className="w-8 h-8 text-orange-500" />My Orders</h1>
          </div>

          {/* Filter */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {['', 'pending', 'preparing', 'out-for-delivery', 'delivered', 'cancelled'].map(s => (
              <button key={s} onClick={() => { setStatusFilter(s); setPage(1) }}
                className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all capitalize ${statusFilter === s ? 'bg-orange-500 text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                {s || 'All Orders'}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="space-y-4">{Array(3).fill(0).map((_, i) => <div key={i} className="h-36 bg-muted rounded-2xl animate-pulse" />)}</div>
          ) : orders.length === 0 ? (
            <EmptyState icon="📦" title="No orders yet" description="Your order history will appear here" actionLabel="Browse Menu" onAction={() => window.location.href = '/menu'} />
          ) : (
            <>
              <div className="space-y-4">
                {orders.map((order, i) => (
                  <motion.div key={order._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                    className="bg-card border border-border rounded-2xl p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-bold text-foreground">#{order.orderNumber}</h3>
                          <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold capitalize ${STATUS_COLOR[order.status] || STATUS_COLOR.pending}`}>
                            {order.status?.replace(/-/g, ' ')}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{formatDateTime(order.createdAt)}</p>
                      </div>
                      <span className="text-xl font-bold text-orange-500">{formatCurrency(order.finalAmount)}</span>
                    </div>

                    {/* Items */}
                    <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
                      {order.items?.slice(0, 4).map((item, j) => {
                        const isCustom = item.type === 'custom' || !!item.customPizza;
                        const pizzaId = item.pizza?._id || item.pizza;

                        const content = (
                          <>
                            <div className={`w-14 h-14 rounded-xl overflow-hidden flex items-center justify-center mx-auto transition-transform duration-250 group-hover:scale-[1.02] ${isCustom ? 'bg-orange-50/50 dark:bg-orange-950/10 p-0.5' : 'bg-muted'}`}>
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
                                <img src={item.image || 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=200'} alt={item.name}
                                  className="w-full h-full object-cover" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1.5 break-words line-clamp-2 leading-tight group-hover:text-orange-500 transition-colors">{item.name}</p>
                          </>
                        );

                        return (
                          <div key={j} className="flex-shrink-0 text-center w-20">
                            {!isCustom && pizzaId ? (
                              <Link to={`/menu/${pizzaId}`} className="group block">
                                {content}
                              </Link>
                            ) : (
                              <div className="group">{content}</div>
                            )}
                          </div>
                        )
                      })}
                      {order.items?.length > 4 && (
                        <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground flex-shrink-0">
                          +{order.items.length - 4}
                        </div>
                      )}
                    </div>

                    {/* Delivery address */}
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4">
                      <MapPin className="w-3.5 h-3.5" />
                      {order.deliveryAddress?.street}, {order.deliveryAddress?.city}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 flex-wrap">
                      <Link to={`/orders/${order._id}`}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 transition-colors">
                        <ExternalLink className="w-3.5 h-3.5" /> Track Order
                      </Link>
                      {order.paymentStatus === 'paid' && (
                        <button onClick={() => handleDownloadInvoice(order._id, order.orderNumber)}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">
                          <Download className="w-3.5 h-3.5" /> Invoice
                        </button>
                      )}
                      {['pending', 'confirmed'].includes(order.status) && (
                        <button onClick={() => handleCancel(order._id)}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-red-200 text-red-500 text-sm font-medium hover:bg-red-50 transition-colors">
                          <XCircle className="w-3.5 h-3.5" /> Cancel
                        </button>
                      )}
                      {order.status === 'delivered' && order.items?.some(item => item.pizza) && (
                        <button onClick={() => handleOpenReviewModal(order)}
                          className={cn(
                            "flex items-center gap-1.5 px-4 py-2 rounded-xl border text-sm font-medium transition-colors",
                            isOrderFullyReviewed(order)
                              ? "border-green-200 text-green-600 bg-green-50/50 hover:bg-green-50 dark:border-green-900/30 dark:text-green-400 dark:bg-green-950/10"
                              : "border-border text-orange-500 hover:bg-muted dark:text-orange-400"
                          )}
                        >
                          {isOrderFullyReviewed(order) ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" /> Reviewed
                            </>
                          ) : (
                            <>
                              <Star className="w-3.5 h-3.5" /> Review Items
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
              {totalPages > 1 && (
                <div className="mt-8 flex justify-center">
                  <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <Modal
        open={isReviewModalOpen}
        onOpenChange={setIsReviewModalOpen}
        title="Review Your Order"
        description={`Share your feedback for order #${selectedOrder?.orderNumber}`}
        className="max-w-md"
      >
        <div className="space-y-6">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Select an item to review
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Pizzas */}
              {selectedOrder?.items?.filter(item => item.pizza).map((item) => {
                const isSelected = selectedPizza?.pizza === item.pizza;
                const isReviewed = reviewedPizzaIds.has(item.pizza.toString());
                return (
                  <button
                    key={item._id}
                    type="button"
                    onClick={() => {
                      setSelectedPizza(item);
                      setRating(5);
                      setComment('');
                    }}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-2xl border text-left transition-all relative overflow-hidden",
                      isSelected
                        ? "border-orange-500 bg-orange-500/5 dark:bg-orange-500/10 ring-1 ring-orange-500"
                        : "border-border hover:border-gray-300 dark:hover:border-gray-700 bg-card"
                    )}
                  >
                    <img
                      src={item.image || 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=200'}
                      alt={item.name}
                      className="w-11 h-11 object-cover rounded-xl flex-shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-foreground truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground capitalize truncate">
                        {item.size} • {formatCurrency(item.price)}
                      </p>
                      {isReviewed && (
                        <span className="text-[10px] text-green-600 dark:text-green-400 font-bold flex items-center gap-0.5 mt-0.5">
                          ✓ Reviewed
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {loadingReviews ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-3">
              <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">Loading reviews...</p>
            </div>
          ) : (
            <>
              {(selectedPizza && !reviewedPizzaIds.has(selectedPizza.pizza.toString())) ? (
                <form onSubmit={handleReviewSubmit} className="space-y-4 pt-4 border-t border-border">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Rating for {selectedPizza.name}
                    </label>
                    <StarRating
                      value={rating}
                      onChange={setRating}
                      size={26}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Your Comments
                    </label>
                    <textarea
                      rows={4}
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Tell us what you liked or disliked about this pizza..."
                      className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder-muted-foreground focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all resize-none"
                      maxLength={1000}
                      required
                    />
                    <div className="flex justify-between items-center text-xs text-muted-foreground mt-1">
                      <span>Honest reviews help others choose!</span>
                      <span>{comment.length}/1000</span>
                    </div>
                  </div>

                  <div className="flex gap-3 justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => setIsReviewModalOpen(false)}
                      className="px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submittingReview}
                      className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:bg-orange-400 text-white text-sm font-medium transition-colors flex items-center justify-center min-w-[120px]"
                    >
                      {submittingReview ? 'Submitting...' : 'Submit Review'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4 pt-4 border-t border-border">
                  <h4 className="text-sm font-bold text-foreground">Your Submitted Review</h4>
                  {(() => {
                    const pizzaIdStr = (selectedPizza?.pizza?._id || selectedPizza?.pizza)?.toString();
                    const r = orderReviews.find(rev => (rev.pizza?._id || rev.pizza)?.toString() === pizzaIdStr);
                    return r ? (
                      <div className="space-y-3 bg-muted/40 dark:bg-muted/10 p-4 rounded-2xl">
                        <div>
                          <p className="text-xs text-muted-foreground font-medium mb-1">Rating</p>
                          <StarRating value={r.rating} readOnly={true} size={18} />
                        </div>
                        <div className="pt-2 border-t border-border/60">
                          <p className="text-xs text-muted-foreground font-medium mb-0.5">Comments</p>
                          <p className="text-sm text-foreground italic">"{r.comment}"</p>
                        </div>
                        <div className="flex justify-end pt-2">
                          <button
                            type="button"
                            disabled={deletingReview}
                            onClick={() => handleReviewDelete(r._id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-xs font-bold transition-colors dark:bg-red-950/20 dark:text-red-400 dark:hover:bg-red-950/40"
                          >
                            Delete Review
                          </button>
                        </div>
                      </div>
                    ) : null;
                  })()}
                </div>
              )}
            </>
          )}
        </div>
      </Modal>

      <Footer />
    </div>
  )
}
