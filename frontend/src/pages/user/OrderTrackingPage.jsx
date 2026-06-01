import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Package, ChefHat, Flame, Truck, CheckCircle2, XCircle, Clock, Download, Phone, Star } from 'lucide-react'
import Navbar from '../../components/layout/Navbar'
import Modal from '../../components/ui/Modal'
import StarRating from '../../components/ui/StarRating'
import { getOrderById } from '../../api/order'
import { createReview, getOrderReviews, deleteReview } from '../../api/review'
import { useSocket } from '../../hooks/useSocket'
import { formatCurrency, formatDateTime, cn } from '../../lib/utils'
import toast from 'react-hot-toast'
import PizzaPreview from '../../components/pizza/PizzaPreview'

const STATUS_STEPS = [
  { key: 'pending', label: 'Order Placed', icon: Package, color: 'text-blue-500', bg: 'bg-blue-500' },
  { key: 'confirmed', label: 'Confirmed', icon: CheckCircle2, color: 'text-indigo-500', bg: 'bg-indigo-500' },
  { key: 'preparing', label: 'Preparing', icon: ChefHat, color: 'text-yellow-500', bg: 'bg-yellow-500' },
  { key: 'out-for-delivery', label: 'Out for Delivery', icon: Truck, color: 'text-purple-500', bg: 'bg-purple-500' },
  { key: 'delivered', label: 'Delivered', icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500' },
]

export default function OrderTrackingPage() {
  const { id } = useParams()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const { socket } = useSocket()

  // Review states
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false)
  const [selectedPizza, setSelectedPizza] = useState(null)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)
  const [orderReviews, setOrderReviews] = useState([])
  const [loadingReviews, setLoadingReviews] = useState(false)
  const [deletingReview, setDeletingReview] = useState(false)

  // Derived review states
  const reviewedPizzaIds = new Set(orderReviews.filter(r => r.pizza).map(r => (r.pizza?._id || r.pizza).toString()))
  const isFullyReviewed = order?.items?.filter(item => item.pizza).every(item => reviewedPizzaIds.has((item.pizza?._id || item.pizza).toString()))

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const { data } = await getOrderById(id)
        setOrder(data.data?.order)
      } catch { toast.error('Order not found') }
      finally { setLoading(false) }
    }
    fetchOrder()
  }, [id])

  useEffect(() => {
    if (!socket || !id) return
    socket.emit('join-order-room', id)
    socket.on('order-status-update', (data) => {
      if (data.orderId === id) {
        setOrder(prev => prev ? { ...prev, status: data.status, statusHistory: data.statusHistory } : prev)
        toast.success(`Order status: ${data.status && typeof data.status === 'string' ? data.status.replace(/-/g, ' ') : String(data.status || '')} 🚀`)
      }
    })
    return () => { socket.off('order-status-update') }
  }, [socket, id])

  useEffect(() => {
    const fetchReviews = async () => {
      if (!order || order.status !== 'delivered') return
      setLoadingReviews(true)
      try {
        const { data } = await getOrderReviews(id)
        setOrderReviews(data.data?.reviews || [])
      } catch {
        // Ignore reviews fetch error silently
      } finally {
        setLoadingReviews(false)
      }
    }
    fetchReviews()
  }, [order, id])

  const handleOpenReviewModal = async (preselectPizza = null) => {
    if (!order) return
    setIsReviewModalOpen(true)
    setLoadingReviews(true)
    setOrderReviews([])
    
    // Reset inputs
    setRating(5)
    setComment('')
    setSelectedPizza(preselectPizza)

    try {
      const { data } = await getOrderReviews(id)
      const reviews = data.data?.reviews || []
      setOrderReviews(reviews)
      
      const reviewedIds = new Set(reviews.filter(r => r.pizza).map(r => (r.pizza?._id || r.pizza).toString()))
      
      if (preselectPizza) {
        setSelectedPizza(preselectPizza)
      } else {
        // Auto-select first unreviewed item
        const reviewable = order.items?.filter(item => item.pizza) || []
        const firstUnreviewedPizza = reviewable.find(item => !reviewedIds.has((item.pizza?._id || item.pizza).toString()))
        
        if (firstUnreviewedPizza) {
          setSelectedPizza(firstUnreviewedPizza)
        } else {
          setSelectedPizza(reviewable[0] || null)
        }
      }
    } catch {
      toast.error('Failed to load existing reviews')
      const reviewable = order.items?.filter(item => item.pizza) || []
      if (!selectedPizza) {
        setSelectedPizza(reviewable[0] || null)
      }
    } finally {
      setLoadingReviews(false)
    }
  }

  const handleReviewSubmit = async (e) => {
    e.preventDefault()
    if (!order) return
    if (!comment.trim()) return toast.error('Please write a comment')

    setSubmittingReview(true)
    try {
      if (!selectedPizza) return
      const pId = selectedPizza.pizza?._id || selectedPizza.pizza
      const res = await createReview({
        orderId: order._id,
        pizzaId: pId,
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

      setComment('')

      // Auto-advance
      const reviewable = order.items?.filter(item => item.pizza) || []
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
      setOrderReviews(prev => prev.filter(r => r._id !== reviewId))
      
      // Reset inputs
      setRating(5)
      setComment('')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete review')
    } finally {
      setDeletingReview(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 pt-28">
        {Array(3).fill(0).map((_, i) => <div key={i} className="h-20 bg-muted rounded-2xl animate-pulse mb-4" />)}
      </div>
    </div>
  )

  if (!order) return null

  const currentStepIdx = STATUS_STEPS.findIndex(s => s.key === order.status)
  const isCancelled = order.status === 'cancelled'

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="py-8">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-3xl font-display font-bold text-foreground">Track Order</h1>
              <Link to="/orders" className="text-sm text-orange-500 hover:text-orange-600 font-medium">All Orders</Link>
            </div>
            <p className="text-muted-foreground">Order #{order.orderNumber}</p>
          </motion.div>

          {/* Status Card */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-card border border-border rounded-2xl p-6 mb-6">
            {isCancelled ? (
              <div className="flex items-center gap-4 text-red-500">
                <XCircle className="w-12 h-12" />
                <div>
                  <p className="text-xl font-bold">Order Cancelled</p>
                  <p className="text-sm text-muted-foreground">{order.cancellationReason || 'Cancelled by request'}</p>
                </div>
              </div>
            ) : (
              <div className="relative">
                {/* Progress line */}
                <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-border" style={{ top: '20px', bottom: '20px' }} />
                <div className="absolute left-5 top-0 w-0.5 bg-orange-500 transition-all duration-500"
                  style={{ top: '20px', height: `${(currentStepIdx / (STATUS_STEPS.length - 1)) * 100}%` }} />

                <div className="space-y-6">
                  {STATUS_STEPS.map((step, i) => {
                    const isCompleted = i <= currentStepIdx
                    const isCurrent = i === currentStepIdx
                    const Icon = step.icon
                    const historyEntry = order.statusHistory?.find(h => h.status === step.key)
                    return (
                      <div key={step.key} className="flex items-start gap-4 relative">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 z-10 border-2 transition-all ${
                          isCompleted ? `${step.bg} border-transparent text-white` : 'bg-background border-border text-muted-foreground'
                        } ${isCurrent ? 'ring-4 ring-orange-500/30 scale-110' : ''}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="pt-1.5">
                          <p className={`font-semibold ${isCompleted ? 'text-foreground' : 'text-muted-foreground'}`}>{step.label}</p>
                          {historyEntry && <p className="text-xs text-muted-foreground mt-0.5">{formatDateTime(historyEntry.timestamp)}</p>}
                          {isCurrent && !historyEntry && <p className="text-xs text-orange-500 mt-0.5 animate-pulse">In progress...</p>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </motion.div>

          {/* ETA */}
          {!isCancelled && order.status !== 'delivered' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-700 rounded-2xl p-4 mb-6 flex items-center gap-3">
              <Clock className="w-5 h-5 text-orange-500 flex-shrink-0" />
              <div>
                <p className="font-semibold text-orange-700 dark:text-orange-400">Estimated Delivery</p>
                <p className="text-sm text-orange-600/80">{order.estimatedDelivery ? formatDateTime(order.estimatedDelivery) : 'Within 30-45 minutes'}</p>
              </div>
            </motion.div>
          )}

          {/* Order Details */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="bg-card border border-border rounded-2xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-foreground">Order Details</h2>
              {order.status === 'delivered' && (
                <button
                  onClick={() => handleOpenReviewModal(null)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-colors",
                    isFullyReviewed
                      ? "border-green-200 text-green-600 bg-green-50/50 hover:bg-green-50 dark:border-green-900/30 dark:text-green-400 dark:bg-green-950/10"
                      : "border-orange-500/20 text-orange-500 hover:bg-orange-500/5 dark:text-orange-400"
                  )}
                >
                  {isFullyReviewed ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" /> Reviewed
                    </>
                  ) : (
                    <>
                      <Star className="w-3.5 h-3.5 fill-current" /> Review Items
                    </>
                  )}
                </button>
              )}
            </div>
            <div className="space-y-3 mb-4">
              {order.items?.map((item, i) => {
                const isCustom = item.type === 'custom' || !!item.customPizza;
                const pizzaId = item.pizza?._id || item.pizza;
                const isReviewed = pizzaId && reviewedPizzaIds.has(pizzaId.toString());

                const itemContent = (
                  <>
                    <div className={`w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center transition-transform duration-250 group-hover:scale-[1.02] ${isCustom ? 'bg-orange-50/50 dark:bg-orange-950/10 p-0.5' : 'bg-muted'}`}>
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
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground group-hover:text-orange-500 transition-colors truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{item.size} · Qty: {item.quantity}</p>
                    </div>
                  </>
                );

                return (
                  <div key={i} className="flex gap-3 items-center justify-between">
                    {!isCustom && pizzaId ? (
                      <Link to={`/menu/${pizzaId}`} className="flex flex-1 gap-3 items-center group">
                        {itemContent}
                      </Link>
                    ) : (
                      <div className="flex flex-1 gap-3 items-center group">
                        {itemContent}
                      </div>
                    )}
                    <div className="flex items-center gap-4 flex-shrink-0">
                      {order.status === 'delivered' && !isCustom && pizzaId && (
                        isReviewed ? (
                          <button
                            onClick={() => handleOpenReviewModal(item, false)}
                            className="text-xs text-green-600 dark:text-green-400 font-semibold hover:underline"
                          >
                            ✓ Reviewed
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOpenReviewModal(item, false)}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg border border-border text-[11px] font-bold text-orange-500 hover:bg-muted transition-colors dark:text-orange-400"
                          >
                            ★ Review
                          </button>
                        )
                      )}
                      <span className="font-semibold text-sm">{formatCurrency(item.price * item.quantity)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="border-t border-border pt-4 space-y-1.5 text-sm">
              <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>{formatCurrency(order.totalAmount)}</span></div>
              {order.discountAmount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-{formatCurrency(order.discountAmount)}</span></div>}
              <div className="flex justify-between text-muted-foreground"><span>Delivery</span><span>{order.deliveryFee === 0 ? 'FREE' : formatCurrency(order.deliveryFee)}</span></div>
              <div className="flex justify-between font-bold text-base border-t border-border pt-2"><span>Total Paid</span><span className="text-orange-500">{formatCurrency(order.finalAmount)}</span></div>
            </div>
          </motion.div>

          {/* Delivery Address */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="bg-card border border-border rounded-2xl p-6">
            <h2 className="font-semibold text-foreground mb-3">Delivery Address</h2>
            <p className="text-muted-foreground text-sm">{order.deliveryAddress?.street}, {order.deliveryAddress?.city}, {order.deliveryAddress?.state} — {order.deliveryAddress?.pincode}</p>
            <p className="text-muted-foreground text-sm mt-1">📱 {order.deliveryAddress?.phone}</p>
          </motion.div>
        </div>
      </div>

      <Modal
        open={isReviewModalOpen}
        onOpenChange={setIsReviewModalOpen}
        title="Review Your Order"
        description={`Share your feedback for order #${order.orderNumber}`}
        className="max-w-md"
      >
        <div className="space-y-6">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Select an item to review
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Pizzas */}
              {order.items?.filter(item => item.pizza).map((item) => {
                const pizzaItemId = item.pizza?._id || item.pizza;
                const isSelected = (selectedPizza?.pizza?._id || selectedPizza?.pizza) === pizzaItemId;
                const isReviewed = reviewedPizzaIds.has(pizzaItemId.toString());
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
              {(selectedPizza && !reviewedPizzaIds.has((selectedPizza.pizza?._id || selectedPizza.pizza).toString())) ? (
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

    </div>
  )
}
