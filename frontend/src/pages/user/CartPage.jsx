import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Trash2, Plus, Minus, ShoppingBag, Tag, ArrowRight, ChefHat, Lock, Sparkles } from 'lucide-react'
import Navbar from '../../components/layout/Navbar'
import Footer from '../../components/layout/Footer'
import EmptyState from '../../components/ui/EmptyState'
import { SkeletonCard } from '../../components/ui/Skeleton'
import { useCart } from '../../hooks/useCart'
import { formatCurrency } from '../../lib/utils'
import toast from 'react-hot-toast'
import { applyCoupon, removeCoupon } from '../../api/cart'
import { getEligibleCoupons } from '../../api/coupon'
import PizzaPreview from '../../components/pizza/PizzaPreview'

import { getSettings } from '../../api/setting'

export default function CartPage() {
  const { cart, cartItems, loading, updateQuantity, removeFromCart, clearCart, refreshCart } = useCart()
  const navigate = useNavigate()
  const [couponCode, setCouponCode] = useState('')
  const [couponLoading, setCouponLoading] = useState(false)
  const [appliedCoupon, setAppliedCoupon] = useState(null)

  // Auto-apply and suggestions states
  const [hasManuallyRemoved, setHasManuallyRemoved] = useState(false)
  const [autoApplying, setAutoApplying] = useState(false)
  const [eligibleCouponsData, setEligibleCouponsData] = useState({ available: [], locked: [] })

  // Settings states
  const [deliveryFee, setDeliveryFee] = useState(49)
  const [freeDeliveryThreshold, setFreeDeliveryThreshold] = useState(499)

  // Fetch store settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await getSettings()
        const settings = data.data || {}
        if (typeof settings.deliveryFee === 'number') setDeliveryFee(settings.deliveryFee)
        if (typeof settings.freeDeliveryThreshold === 'number') setFreeDeliveryThreshold(settings.freeDeliveryThreshold)
      } catch (err) {
        console.error('Failed to load store settings:', err)
      }
    }
    fetchSettings()
  }, [])

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const discount = cart?.couponDiscountAmount || 0
  const discountPercent = cart?.couponDiscount || 0
  const delivery = subtotal >= freeDeliveryThreshold ? 0 : deliveryFee
  const total = Math.max(0, subtotal - discount + delivery)

  useEffect(() => {
    if (cart?.couponCode) {
      setAppliedCoupon({ code: cart.couponCode, discount: Number(cart.couponDiscount || 0) })
    } else {
      setAppliedCoupon(null)
    }
  }, [cart?.couponCode, cart?.couponDiscount])

  // Reset manual removal state when cart becomes empty
  useEffect(() => {
    if (cartItems.length === 0) {
      setHasManuallyRemoved(false)
    }
  }, [cartItems.length])

  // Fetch suggestions
  useEffect(() => {
    if (loading || cartItems.length === 0) return

    const fetchSuggestions = async () => {
      try {
        const res = await getEligibleCoupons()
        if (res.data.success) {
          setEligibleCouponsData(res.data.data)
        }
      } catch (err) {
        console.error('Failed to fetch suggestions:', err)
      }
    }
    fetchSuggestions()
  }, [cartItems.length, subtotal, loading, cart?.couponCode])

  const handleApplyCoupon = async (code = null) => {
    const codeToApply = (typeof code === 'string' ? code : couponCode).trim().toUpperCase()
    if (!codeToApply) return toast.error('Enter a coupon code')
    setCouponLoading(true)
    try {
      const { data } = await applyCoupon(codeToApply)
      const discountVal = Number(data.data?.coupon?.discount ?? data.data?.cart?.couponDiscount ?? 0)
      setAppliedCoupon({ code: codeToApply, discount: discountVal })
      toast.success(`Coupon applied! 🎉`)
      setCouponCode('')
      await refreshCart()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid coupon')
    } finally {
      setCouponLoading(false)
    }
  }

  const handleRemoveCoupon = async () => {
    setHasManuallyRemoved(true)
    try {
      await removeCoupon()
      setAppliedCoupon(null)
      setCouponCode('')
      toast.success('Coupon removed')
      await refreshCart()
    } catch { 
      setAppliedCoupon(null)
      setCouponCode('')
      await refreshCart()
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 pt-28 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">{Array(3).fill(0).map((_, i) => <div key={i} className="h-28 bg-muted rounded-2xl animate-pulse" />)}</div>
          <div className="h-80 bg-muted rounded-2xl animate-pulse" />
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-8">
            <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
              <ShoppingBag className="w-8 h-8 text-orange-500" />
              My Cart
              {cartItems.length > 0 && <span className="text-lg text-muted-foreground font-normal">({cartItems.length} items)</span>}
            </h1>
            {cartItems.length > 0 && (
              <button onClick={() => { clearCart(); toast.success('Cart cleared') }} className="text-sm text-red-500 hover:text-red-600 font-medium flex items-center gap-1">
                <Trash2 className="w-4 h-4" /> Clear All
              </button>
            )}
          </div>

          {cartItems.length === 0 ? (
            <EmptyState icon="🛒" title="Your cart is empty" description="Add some delicious pizzas to your cart" actionLabel="Browse Menu" onAction={() => navigate('/menu')} />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Cart Items */}
              <div className="lg:col-span-2 space-y-4">
                <AnimatePresence>
                  {cartItems.map(item => (
                    <motion.div key={item._id} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -100 }}
                      className="bg-card border border-border rounded-2xl p-5 flex gap-4">
                      <div className={`w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center ${item.type === 'custom' ? 'bg-orange-50/50 dark:bg-orange-950/10 p-1.5' : 'bg-muted'}`}>
                        {item.type === 'custom' ? (
                          <PizzaPreview
                            size={item.customizations?.size || item.size || 'medium'}
                            base={item.customizations?.base || 'thin'}
                            sauce={item.customizations?.sauce || 'tomato'}
                            cheese={item.customizations?.cheese || 'mozzarella'}
                            veggies={item.customizations?.veggies || []}
                            hideDetails={true}
                          />
                        ) : (
                          <img src={item.image || 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400'} alt={item.name} className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-semibold text-foreground">{item.name}</h3>
                            <p className="text-sm text-muted-foreground capitalize mt-0.5">
                              {item.size && `Size: ${item.size}`}
                              {item.type === 'custom' && ' · Custom Pizza'}
                            </p>
                            {item.customizations && Object.keys(item.customizations).length > 0 && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                {Object.entries(item.customizations).filter(([, v]) => v).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' · ')}
                              </p>
                            )}
                          </div>
                          <button onClick={() => removeFromCart(item._id)} className="text-muted-foreground hover:text-red-500 transition-colors flex-shrink-0">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
                            <button onClick={() => updateQuantity(item._id, item.quantity - 1)} disabled={item.quantity <= 1}
                              className="w-7 h-7 rounded-md bg-background flex items-center justify-center hover:bg-orange-50 disabled:opacity-40 transition-colors">
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-6 text-center font-bold text-sm">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item._id, item.quantity + 1)}
                              className="w-7 h-7 rounded-md bg-background flex items-center justify-center hover:bg-orange-50 transition-colors">
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                          <span className="font-bold text-orange-500 text-lg">{formatCurrency(item.price * item.quantity)}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Build custom */}
                <Link to="/build" className="flex items-center gap-3 p-4 border-2 border-dashed border-border rounded-2xl text-muted-foreground hover:border-orange-400 hover:text-orange-500 transition-all group">
                  <ChefHat className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span className="font-medium">Add a custom pizza</span>
                  <ArrowRight className="w-4 h-4 ml-auto" />
                </Link>
              </div>

              {/* Order Summary */}
              <div className="space-y-4">
                {/* Coupon */}
                <div className="bg-card border border-border rounded-2xl p-5">
                  <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2"><Tag className="w-4 h-4 text-orange-500" /> Coupon Code</h3>
                  {appliedCoupon ? (
                    <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl px-4 py-3">
                      <div>
                        <p className="font-bold text-green-700 dark:text-green-400">{appliedCoupon.code}</p>
                        <p className="text-xs text-green-600">
                          {discountPercent > 0 ? `${discountPercent}% discount applied` : 'Discount applied'}
                        </p>
                      </div>
                      <button onClick={handleRemoveCoupon} className="text-red-500 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <form onSubmit={(e) => { e.preventDefault(); handleApplyCoupon(); }} className="flex gap-2">
                      <input value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())} placeholder="PIZZA10"
                        className="flex-1 px-3 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 uppercase font-mono font-bold" />
                      <button type="submit" disabled={couponLoading}
                        className="px-4 py-2.5 rounded-xl bg-orange-500 text-white font-medium text-sm hover:bg-orange-600 transition-colors disabled:opacity-60">
                        {couponLoading ? '...' : 'Apply'}
                      </button>
                    </form>
                  )}

                  {/* Try Suggested Coupon Badges */}
                  {cartItems.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border/60">
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                        Suggested Coupons
                      </p>
                      {(!eligibleCouponsData.available || eligibleCouponsData.available.length === 0) && (!eligibleCouponsData.locked || eligibleCouponsData.locked.length === 0) ? (
                        <div className="text-xs text-muted-foreground mt-2 flex flex-wrap items-center gap-1">
                          <span>Try:</span>
                          {['PIZZA10', 'PIZZA20', 'FIRSTORDER'].map((code) => (
                            <button
                              key={code}
                              onClick={() => handleApplyCoupon(code)}
                              className="text-orange-500 hover:text-orange-600 hover:underline font-mono font-bold focus:outline-none cursor-pointer"
                            >
                              {code}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {/* Eligible / Available */}
                          {eligibleCouponsData.available?.map((coupon) => {
                            const isBest = coupon.code === (() => {
                              if (!eligibleCouponsData.available || eligibleCouponsData.available.length === 0) return null
                              const sorted = [...eligibleCouponsData.available].sort((a, b) => {
                                if (b.computedDiscount !== a.computedDiscount) {
                                  return b.computedDiscount - a.computedDiscount
                                }
                                return new Date(a.expiryDate) - new Date(b.expiryDate)
                              })
                              return sorted[0]?.code
                            })()

                            return (
                              <button
                                key={coupon._id}
                                onClick={() => handleApplyCoupon(coupon.code)}
                                className={`text-[11px] font-mono font-bold px-2.5 py-1.5 rounded-lg border transition-colors cursor-pointer flex items-center gap-1 ${
                                  isBest
                                    ? 'text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 border-amber-400 shadow-sm shadow-orange-500/10'
                                    : 'text-orange-600 bg-orange-50 hover:bg-orange-100 dark:bg-orange-950/20 dark:text-orange-400 dark:hover:bg-orange-950/40 border-orange-200 dark:border-orange-900/60'
                                }`}
                                title={isBest ? `Best Offer: Apply ${coupon.code} to save ${formatCurrency(coupon.computedDiscount)}` : `Apply ${coupon.code} (${coupon.title})`}
                              >
                                {isBest && <Sparkles size={10} className="text-white animate-pulse" />}
                                <span>{coupon.code}</span>
                                <span className={`text-[9px] font-sans font-normal ${isBest ? 'text-white/90' : 'opacity-75'}`}>
                                  ({coupon.discountType === 'percentage' ? `${coupon.discountValue}%` : `₹${coupon.discountValue}`})
                                </span>
                              </button>
                            )
                          })}

                          {/* Locked */}
                          {eligibleCouponsData.locked?.map((coupon) => (
                            <button
                              key={coupon._id}
                              disabled
                              className="text-[11px] font-mono font-bold text-gray-400 bg-gray-50 dark:bg-gray-900 px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 opacity-60 flex items-center gap-1 cursor-not-allowed"
                              title={`Locked: ${coupon.isCartValueUnmet ? `Min order value ₹${coupon.minCartValue}` : `Min lifetime spend ₹${coupon.minLifetimeSpending}`}`}
                            >
                              <Lock size={10} />
                              <span>{coupon.code}</span>
                              <span className="text-[9px] opacity-75 font-sans font-normal">
                                ({coupon.discountType === 'percentage' ? `${coupon.discountValue}%` : `₹${coupon.discountValue}`})
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Summary */}
                <div className="bg-card border border-border rounded-2xl p-5">
                  <h3 className="font-semibold text-foreground mb-4">Order Summary</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
                    {discount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Discount {discountPercent > 0 && `(${discountPercent}%)`}</span>
                        <span>-{formatCurrency(discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Delivery</span>
                      {delivery === 0 ? <span className="text-green-600 font-medium">FREE 🎉</span> : <span>{formatCurrency(delivery)}</span>}
                    </div>
                    {delivery > 0 && (
                      <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                        Add {formatCurrency(freeDeliveryThreshold - subtotal)} more for free delivery
                      </p>
                    )}
                    <div className="border-t border-border pt-3 flex justify-between font-bold text-lg">
                      <span>Total</span>
                      <span className="text-orange-500">{formatCurrency(total)}</span>
                    </div>
                  </div>
                  <motion.button onClick={() => navigate('/checkout')} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    className="w-full mt-5 py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-orange-500/30">
                    Proceed to Checkout <ArrowRight className="w-5 h-5" />
                  </motion.button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  )
}
