import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, Plus, CreditCard, ChevronRight, Check, Banknote, ShieldCheck, Ticket, Lock, X, Star, Hourglass, Gift, AlertTriangle, Sparkles } from 'lucide-react'
import Navbar from '../../components/layout/Navbar'
import { useCart } from '../../hooks/useCart'
import { useAuth } from '../../hooks/useAuth'
import { createOrder } from '../../api/order'
import { initiatePayment, verifyPayment } from '../../api/payment'
import { getUserProfile, addAddress } from '../../api/auth'
import { getSettings } from '../../api/setting'
import { applyCoupon, removeCoupon } from '../../api/cart'
import { getEligibleCoupons } from '../../api/coupon'
import { formatCurrency } from '../../lib/utils'
import toast from 'react-hot-toast'
import PizzaPreview from '../../components/pizza/PizzaPreview'

const STEPS = ['Address', 'Review Order', 'Payment']
const DELIVERY_FEE = 49
const FREE_DELIVERY_THRESHOLD = 499

export default function CheckoutPage() {
  const { cart, cartItems, clearCart, refreshCart, loading: cartLoading } = useCart()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [addresses, setAddresses] = useState([])
  const [selectedAddress, setSelectedAddress] = useState(null)
  const [showAddAddress, setShowAddAddress] = useState(false)
  const [newAddress, setNewAddress] = useState({ label: 'Home', street: '', city: '', state: '', pincode: '', phone: '' })
  const [loading, setLoading] = useState(false)
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('razorpay')
  const [codEnabled, setCodEnabled] = useState(false)
  const [deliveryFee, setDeliveryFee] = useState(49)
  const [freeDeliveryThreshold, setFreeDeliveryThreshold] = useState(499)

  // Coupon states
  const [showCouponModal, setShowCouponModal] = useState(false)
  const [eligibleCoupons, setEligibleCoupons] = useState({ available: [], locked: [], used: [], expired: [] })
  const [loadingCoupons, setLoadingCoupons] = useState(false)
  const [manualCouponCode, setManualCouponCode] = useState('')
  const [hasManuallyRemoved, setHasManuallyRemoved] = useState(false)
  const [autoApplying, setAutoApplying] = useState(false)

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const discount = cart.couponDiscountAmount || 0
  const discountPercent = cart.couponDiscount || 0
  const delivery = subtotal >= freeDeliveryThreshold ? 0 : deliveryFee
  const total = Math.max(0, subtotal - discount + delivery)

  // Fetch eligible coupons on mount / subtotal changes to support auto-apply and summaries
  useEffect(() => {
    if (cartItems.length === 0) return
    const fetchCoupons = async () => {
      setLoadingCoupons(true)
      try {
        const res = await getEligibleCoupons()
        if (res.data.success) {
          setEligibleCoupons(res.data.data)
        }
      } catch {
        console.error('Failed to load eligible coupons.')
      } finally {
        setLoadingCoupons(false)
      }
    }
    fetchCoupons()
  }, [cartItems.length, subtotal])

  const getBestCoupon = (availableList) => {
    if (!availableList || availableList.length === 0) return null
    return [...availableList].sort((a, b) => {
      // 1. Highest savings
      if (b.computedDiscount !== a.computedDiscount) {
        return b.computedDiscount - a.computedDiscount
      }
      // 2. Expiry urgency (closer date first)
      return new Date(a.expiryDate) - new Date(b.expiryDate)
    })[0]
  }

  // No auto-apply is run at checkout. Instead we recommend the coupon in the UI.

  // Reset override flag when cart is emptied
  useEffect(() => {
    if (cartItems.length === 0) {
      setHasManuallyRemoved(false)
    }
  }, [cartItems.length])

  const getExpiryMessage = (coupon) => {
    if (coupon.isWeekendOnly) return 'WEEKEND SPECIAL ⚡'
    const now = new Date()
    const expiry = new Date(coupon.expiryDate)
    const diffTime = expiry - now
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays <= 0) return 'Expired'
    if (diffDays === 1) {
      const diffHours = Math.ceil(diffTime / (1000 * 60 * 60))
      return `EXPIRES IN ${diffHours} HOUR${diffHours > 1 ? 'S' : ''}! ⏳`
    }
    if (diffDays <= 3) return `EXPIRES IN ${diffDays} DAYS! 🔥`
    return 'LIMITED TIME OFFER'
  }

  const renderBadges = (coupon) => {
    const badges = []
    if (coupon.isFirstOrderOnly) {
      badges.push(
        <span key="new" className="bg-orange-50 text-orange-600 dark:bg-orange-950/20 dark:text-orange-400 border border-orange-200 dark:border-orange-900/50 text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
          NEW USER
        </span>
      )
    }
    if (coupon.minLifetimeSpending > 0) {
      badges.push(
        <span key="vip" className="bg-yellow-50 text-yellow-700 dark:bg-yellow-950/20 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-900/50 text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-sm">
          <Star size={9} className="fill-current text-yellow-500" /> VIP
        </span>
      )
    }
    if (coupon.isWeekendOnly) {
      badges.push(
        <span key="weekend" className="bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50 text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
          WEEKEND SPECIAL
        </span>
      )
    }
    if (coupon.isPremiumOnly) {
      badges.push(
        <span key="premium" className="bg-purple-50 text-purple-600 dark:bg-purple-950/20 dark:text-purple-400 border border-purple-200 dark:border-purple-900/50 text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
          PREMIUM
        </span>
      )
    }
    if (badges.length === 0) {
      badges.push(
        <span key="limited" className="bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400 border border-red-200 dark:border-red-900/50 text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
          <Hourglass size={9} /> LIMITED TIME
        </span>
      )
    }
    return <div className="flex flex-wrap gap-1 mt-1.5">{badges}</div>
  }

  const sortCoupons = (list) => {
    return [...list].sort((a, b) => {
      // 1. New User Offers (isFirstOrderOnly)
      if (a.isFirstOrderOnly && !b.isFirstOrderOnly) return -1
      if (!a.isFirstOrderOnly && b.isFirstOrderOnly) return 1
      
      // 2. Daily Deals (neither VIP nor Premium/Weekend)
      const aIsVip = a.minLifetimeSpending > 0
      const bIsVip = b.minLifetimeSpending > 0
      const aIsPremiumOrWeekend = a.isPremiumOnly || a.isWeekendOnly
      const bIsPremiumOrWeekend = b.isPremiumOnly || b.isWeekendOnly
      
      const aIsDaily = !aIsVip && !aIsPremiumOrWeekend
      const bIsDaily = !bIsVip && !bIsPremiumOrWeekend
      if (aIsDaily && !bIsDaily) return -1
      if (!aIsDaily && bIsDaily) return 1
 
      // 3. Premium Deals / Weekend Specials
      if (aIsPremiumOrWeekend && !bIsPremiumOrWeekend) return -1
      if (!aIsPremiumOrWeekend && bIsPremiumOrWeekend) return 1
 
      // 4. VIP Rewards
      if (aIsVip && !bIsVip) return 1
      if (!aIsVip && bIsVip) return -1
 
      return 0
    })
  }

  const handleApplyCoupon = async (code) => {
    try {
      const res = await applyCoupon(code)
      if (res.data.success) {
        toast.success(res.data.message)
        refreshCart()
        setShowCouponModal(false)
        setManualCouponCode('')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to apply coupon')
    }
  }

  const handleRemoveCoupon = async () => {
    setHasManuallyRemoved(true)
    try {
      const res = await removeCoupon()
      if (res.data.success) {
        toast.success('Coupon removed.')
        refreshCart()
      }
    } catch {
      toast.error('Failed to remove coupon.')
    }
  }

  // Load COD and fees settings from database
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await getSettings()
        const settings = data.data || {}
        setCodEnabled(!!settings.cashOnDelivery)
        if (typeof settings.deliveryFee === 'number') setDeliveryFee(settings.deliveryFee)
        if (typeof settings.freeDeliveryThreshold === 'number') setFreeDeliveryThreshold(settings.freeDeliveryThreshold)
      } catch {
        setCodEnabled(false)
      }
    }
    fetchSettings()
  }, [])

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data } = await getUserProfile()
        const addrs = data.data?.user?.addresses || []
        setAddresses(addrs)
        const def = addrs.find(a => a.isDefault) || addrs[0]
        if (def) setSelectedAddress(def)
      } catch {}
    }
    fetchProfile()
  }, [])

  const handleAddAddress = async (e) => {
    e.preventDefault()
    if (!newAddress.street || !newAddress.city || !newAddress.pincode || !newAddress.phone) return toast.error('Fill all address fields')
    setLoading(true)
    try {
      const { data } = await addAddress(newAddress)
      const addrs = data.data.addresses
      setAddresses(addrs)
      setSelectedAddress(addrs[addrs.length - 1])
      setShowAddAddress(false)
      toast.success('Address added!')
    } catch { toast.error('Failed to add address') }
    finally { setLoading(false) }
  }

  const loadRazorpay = () => new Promise(resolve => {
    if (window.Razorpay) return resolve(true)
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })

  const handleCodOrder = async () => {
    if (!selectedAddress) return toast.error('Select a delivery address')
    if (!codEnabled) return toast.error('Cash on Delivery (COD) is currently disabled')
    setPaymentLoading(true)
    try {
      const { data: orderData } = await createOrder({
        deliveryAddress: selectedAddress,
        paymentMethod: 'cod',
      })
      const order = orderData.data.order
      await clearCart()
      toast.success('Order placed successfully! Pay on delivery 🎉')
      navigate(`/orders/${order._id}`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong')
    } finally {
      setPaymentLoading(false)
    }
  }

  const handleRazorpayPayment = async () => {
    if (!selectedAddress) return toast.error('Select a delivery address')
    setPaymentLoading(true)
    try {
      // Initiate payment - creates Razorpay order & Payment record in backend (no MongoDB Order document yet)
      const { data: rzpResponse } = await initiatePayment({
        deliveryAddress: selectedAddress,
      })
      const rzpData = rzpResponse.data

      const loaded = await loadRazorpay()
      if (!loaded) throw new Error('Razorpay failed to load')

      const options = {
        key: rzpData.razorpayKeyId || import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_key',
        amount: rzpData.amount,
        currency: rzpData.currency || 'INR',
        name: 'PizzaHub',
        description: `Checkout Payment`,
        order_id: rzpData.razorpayOrderId,
        prefill: { name: user?.name, email: user?.email, contact: user?.phone },
        theme: { color: '#f97316' },
        handler: async (response) => {
          try {
            const { data: verifyData } = await verifyPayment({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            })
            const createdOrderId = verifyData.data.orderId
            await clearCart()
            toast.success('Payment successful! Order confirmed 🎉')
            navigate(`/orders/${createdOrderId}`)
          } catch { toast.error('Payment verification failed') }
        },
        modal: { ondismiss: () => { setPaymentLoading(false); toast.error('Payment cancelled') } },
      }
      const rzp = new window.Razorpay(options)
      rzp.open()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong')
      setPaymentLoading(false)
    }
  }

  const handlePayment = () => {
    if (paymentMethod === 'cod') {
      handleCodOrder()
    } else {
      handleRazorpayPayment()
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-display font-bold text-foreground py-8">Checkout</h1>

          {/* Step Progress */}
          <div className="flex items-center mb-10">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center flex-1 last:flex-none">
                <div className={`flex items-center justify-center w-9 h-9 rounded-full border-2 font-bold text-sm transition-all ${
                  step > i ? 'bg-orange-500 border-orange-500 text-white' : step === i ? 'border-orange-500 text-orange-500' : 'border-border text-muted-foreground'}`}>
                  {step > i ? <Check className="w-4 h-4" /> : i + 1}
                </div>
                <span className={`ml-2 text-sm font-medium ${step >= i ? 'text-foreground' : 'text-muted-foreground'}`}>{s}</span>
                {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 mx-4 rounded ${step > i ? 'bg-orange-500' : 'bg-border'}`} />}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <AnimatePresence mode="wait">
                {/* Step 0: Address */}
                {step === 0 && (
                  <motion.div key="addr" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                    <div className="bg-card border border-border rounded-2xl p-6">
                      <h2 className="font-display font-bold text-xl text-foreground mb-5 flex items-center gap-2"><MapPin className="w-5 h-5 text-orange-500" />Delivery Address</h2>
                      <div className="space-y-3 mb-5">
                        {addresses.map((addr, i) => (
                          <div key={i} onClick={() => setSelectedAddress(addr)}
                            className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedAddress === addr ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/10' : 'border-border hover:border-orange-300'}`}>
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-orange-500 bg-orange-100 dark:bg-orange-900/30 px-2 py-0.5 rounded-md">{addr.label}</span>
                              {selectedAddress === addr && <Check className="w-4 h-4 text-orange-500" />}
                            </div>
                            <p className="text-foreground font-medium mt-1">{addr.street}</p>
                            <p className="text-muted-foreground text-sm">{addr.city}, {addr.state} - {addr.pincode}</p>
                            <p className="text-muted-foreground text-sm">📱 {addr.phone}</p>
                          </div>
                        ))}
                      </div>

                      {showAddAddress ? (
                        <form onSubmit={handleAddAddress} className="border border-dashed border-border rounded-xl p-4 space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            {[['label', 'Label (Home/Work)'], ['street', 'Street Address'], ['city', 'City'], ['state', 'State'], ['pincode', 'Pincode'], ['phone', 'Phone']].map(([k, pl]) => (
                              <input key={k} placeholder={pl} value={newAddress[k]} onChange={e => setNewAddress(a => ({ ...a, [k]: e.target.value }))}
                                className={`px-3 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 ${k === 'street' ? 'col-span-2' : ''}`} />
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <button type="submit" disabled={loading} className="px-4 py-2 rounded-xl bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 transition-colors disabled:opacity-60">Save Address</button>
                            <button type="button" onClick={() => setShowAddAddress(false)} className="px-4 py-2 rounded-xl border border-border text-sm hover:bg-muted transition-colors">Cancel</button>
                          </div>
                        </form>
                      ) : (
                        <button onClick={() => setShowAddAddress(true)} className="flex items-center gap-2 text-orange-500 font-medium hover:text-orange-600 text-sm">
                          <Plus className="w-4 h-4" /> Add New Address
                        </button>
                      )}

                      <button onClick={() => { if (!selectedAddress) return toast.error('Select an address'); setStep(1) }}
                        disabled={!selectedAddress} className="w-full mt-6 py-3.5 rounded-xl bg-orange-500 text-white font-bold flex items-center justify-center gap-2 hover:bg-orange-600 transition-colors disabled:opacity-60">
                        Continue <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Step 1: Review */}
                {step === 1 && (
                  <motion.div key="review" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                    <div className="bg-card border border-border rounded-2xl p-6">
                      <h2 className="font-display font-bold text-xl text-foreground mb-5">Review Your Order</h2>
                      <div className="space-y-3 mb-6">
                        {cartItems.map(item => (
                          <div key={item._id} className="flex gap-3 items-center py-3 border-b border-border last:border-0">
                            <div className={`w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center ${item.type === 'custom' ? 'bg-orange-50/50 dark:bg-orange-950/10 p-0.5' : 'bg-muted'}`}>
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
                                <img src={item.image || 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=200'} alt={item.name} className="w-full h-full object-cover" />
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-foreground">{item.name}</p>
                              <p className="text-xs text-muted-foreground capitalize">{item.size && `${item.size} ·`} Qty: {item.quantity}</p>
                            </div>
                            <span className="font-bold text-foreground">{formatCurrency(item.price * item.quantity)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="bg-muted/50 rounded-xl p-4 mb-6">
                        <p className="text-sm font-semibold text-foreground mb-1">Delivering to:</p>
                        <p className="text-sm text-muted-foreground">{selectedAddress?.street}, {selectedAddress?.city}, {selectedAddress?.state} - {selectedAddress?.pincode}</p>
                      </div>
                      <div className="flex gap-3">
                        <button onClick={() => setStep(0)} className="flex-1 py-3.5 rounded-xl border border-border font-bold hover:bg-muted transition-colors">Back</button>
                        <button onClick={() => setStep(2)} className="flex-1 py-3.5 rounded-xl bg-orange-500 text-white font-bold flex items-center justify-center gap-2 hover:bg-orange-600 transition-colors">
                          Proceed to Pay <ChevronRight className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Step 2: Payment */}
                {step === 2 && (
                  <motion.div key="payment" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                    <div className="bg-card border border-border rounded-2xl p-6">
                      <h2 className="font-display font-bold text-xl text-foreground mb-5 flex items-center gap-2"><CreditCard className="w-5 h-5 text-orange-500" />Payment</h2>

                      {/* Payment Method Selection */}
                      <div className="space-y-3 mb-6">
                        <p className="text-sm font-semibold text-foreground">Choose Payment Method</p>

                        {/* Online Payment (Razorpay) */}
                        <div
                          onClick={() => setPaymentMethod('razorpay')}
                          className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                            paymentMethod === 'razorpay'
                              ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/10'
                              : 'border-border hover:border-orange-300'
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            paymentMethod === 'razorpay' ? 'bg-orange-500 text-white' : 'bg-muted text-muted-foreground'
                          }`}>
                            <CreditCard className="w-5 h-5" />
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-foreground text-sm">Pay Online</p>
                            <p className="text-xs text-muted-foreground">UPI, Cards, Net Banking via Razorpay</p>
                          </div>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                            paymentMethod === 'razorpay' ? 'border-orange-500' : 'border-border'
                          }`}>
                            {paymentMethod === 'razorpay' && <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />}
                          </div>
                        </div>

                        {/* Cash on Delivery */}
                        {codEnabled && (
                          <div
                            onClick={() => setPaymentMethod('cod')}
                            className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                              paymentMethod === 'cod'
                                ? 'border-green-500 bg-green-50 dark:bg-green-900/10'
                                : 'border-border hover:border-green-300'
                            }`}
                          >
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                              paymentMethod === 'cod' ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'
                            }`}>
                              <Banknote className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-foreground text-sm">Cash on Delivery</p>
                              <p className="text-xs text-muted-foreground">Pay when your order arrives</p>
                            </div>
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                              paymentMethod === 'cod' ? 'border-green-500' : 'border-border'
                            }`}>
                              {paymentMethod === 'cod' && <div className="w-2.5 h-2.5 rounded-full bg-green-500" />}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Security note */}
                      <div className={`border rounded-xl p-4 mb-6 ${
                        paymentMethod === 'cod'
                          ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-700'
                          : 'bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-700'
                      }`}>
                        <p className={`text-sm font-medium flex items-center gap-1.5 ${
                          paymentMethod === 'cod'
                            ? 'text-green-700 dark:text-green-400'
                            : 'text-orange-700 dark:text-orange-400'
                        }`}>
                          <ShieldCheck className="w-4 h-4" />
                          {paymentMethod === 'cod' ? 'Pay cash when your order is delivered' : '🔒 Secure Payment via Razorpay'}
                        </p>
                        <p className={`text-xs mt-1 ${
                          paymentMethod === 'cod'
                            ? 'text-green-600/70'
                            : 'text-orange-600/70'
                        }`}>
                          {paymentMethod === 'cod'
                            ? 'Please keep exact change ready for the delivery partner.'
                            : 'Your payment info is encrypted and secure.'}
                        </p>
                      </div>

                      {/* Order totals */}
                      <div className="space-y-2 text-sm mb-6">
                        <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
                        {discount > 0 && <div className="flex justify-between text-green-600"><span>Discount ({discountPercent}%)</span><span>-{formatCurrency(discount)}</span></div>}
                        <div className="flex justify-between"><span className="text-muted-foreground">Delivery</span><span>{delivery === 0 ? 'FREE' : formatCurrency(delivery)}</span></div>
                        <div className="flex justify-between font-bold text-lg border-t border-border pt-2"><span>Total</span><span className="text-orange-500">{formatCurrency(total)}</span></div>
                      </div>
                      <div className="flex gap-3">
                        <button onClick={() => setStep(1)} className="flex-1 py-3.5 rounded-xl border border-border font-bold hover:bg-muted transition-colors">Back</button>
                        <motion.button onClick={handlePayment} disabled={paymentLoading} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                          className={`flex-1 py-3.5 rounded-xl text-white font-bold flex items-center justify-center gap-2 shadow-lg disabled:opacity-60 ${
                            paymentMethod === 'cod'
                              ? 'bg-gradient-to-r from-green-500 to-green-600 shadow-green-500/30'
                              : 'bg-gradient-to-r from-orange-500 to-orange-600 shadow-orange-500/30'
                          }`}>
                          {paymentLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : paymentMethod === 'cod' ? <><Banknote className="w-5 h-5" />Place Order — {formatCurrency(total)}</> : <><CreditCard className="w-5 h-5" />Pay {formatCurrency(total)}</>}
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Order Summary sidebar */}
            <div className="bg-card border border-border rounded-2xl p-5 h-fit space-y-4">
              {/* Coupon Section */}
              <div className="border-b border-border pb-4">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Offers & Coupons</h4>
                {cart.couponCode ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/60 rounded-xl px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Ticket size={16} className="text-green-600 dark:text-green-400" />
                        <div>
                          <span className="font-mono font-bold text-xs text-green-700 dark:text-green-400">{cart.couponCode}</span>
                          <p className="text-[10px] text-green-600 dark:text-green-500 font-medium">Saved {formatCurrency(discount)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 font-semibold">
                        <button
                          type="button"
                          onClick={() => setShowCouponModal(true)}
                          className="text-xs text-orange-500 hover:text-orange-605"
                        >
                          Change
                        </button>
                        <span className="text-gray-300 dark:text-gray-700 text-xs">|</span>
                        <button
                          type="button"
                          onClick={handleRemoveCoupon}
                          className="text-xs text-red-500 hover:text-red-605"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                    {eligibleCoupons.available?.length > 0 && cart.couponCode === getBestCoupon(eligibleCoupons.available)?.code && (
                      <p className="text-[10px] text-green-600 dark:text-green-500 font-bold flex items-center gap-1">
                        ✨ Best Savings Applied: {cart.couponCode}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => setShowCouponModal(true)}
                      className="w-full flex items-center justify-between border border-dashed border-orange-300 dark:border-orange-850 bg-orange-50/20 dark:bg-orange-950/10 hover:bg-orange-50/40 dark:hover:bg-orange-950/20 text-orange-600 dark:text-orange-400 font-bold px-3 py-2.5 rounded-xl text-xs transition-all duration-200"
                    >
                      <span className="flex items-center gap-1.5"><Ticket size={14} /> Apply Coupon</span>
                      <ChevronRight size={14} />
                    </button>
                    {(() => {
                      const best = getBestCoupon(eligibleCoupons.available)
                      if (best) {
                        return (
                          <div 
                            onClick={() => handleApplyCoupon(best.code)}
                            className="bg-orange-50 dark:bg-orange-950/30 border border-orange-100 dark:border-orange-900/60 rounded-xl p-3 text-xs cursor-pointer hover:border-orange-350 dark:hover:border-orange-700 transition-all flex items-center justify-between group"
                          >
                            <div className="flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-orange-500 animate-pulse flex-shrink-0" />
                              <div className="text-left">
                                <p className="font-semibold text-orange-600 dark:text-orange-400">Save {formatCurrency(best.computedDiscount)} with {best.code}!</p>
                                <p className="text-[10px] text-gray-550 dark:text-gray-400 mt-0.5">Click to apply this best savings offer</p>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold text-orange-500 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5 uppercase shrink-0">
                              Apply <ChevronRight size={10} />
                            </span>
                          </div>
                        )
                      }
                      return null
                    })()}
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-4">Order Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">{cartItems.length} items</span><span>{formatCurrency(subtotal)}</span></div>
                  {discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount ({discountPercent}%)</span>
                      <span>-{formatCurrency(discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between"><span className="text-muted-foreground">Delivery</span><span className={delivery === 0 ? 'text-green-600' : ''}>{delivery === 0 ? 'FREE' : formatCurrency(delivery)}</span></div>
                  <div className="border-t border-border pt-2 flex justify-between font-bold text-base"><span>Total</span><span className="text-orange-500">{formatCurrency(total)}</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Coupon Modal */}
      <AnimatePresence>
        {showCouponModal && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto"
            onClick={() => setShowCouponModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden my-8"
            >
              {/* Modal Header */}
              <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Ticket className="text-orange-500" /> Apply Coupon
                </h3>
                <button onClick={() => setShowCouponModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-6 max-h-[65vh] overflow-y-auto">
                {/* Manual Coupon Form */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (manualCouponCode.trim()) handleApplyCoupon(manualCouponCode);
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    placeholder="Enter Coupon Code"
                    value={manualCouponCode}
                    onChange={(e) => setManualCouponCode(e.target.value.toUpperCase())}
                    className="flex-1 bg-gray-50 dark:bg-gray-950 border border-gray-250 dark:border-gray-850 px-4 py-2.5 rounded-xl text-sm font-mono font-bold uppercase focus:outline-none focus:border-orange-500"
                  />
                  <button
                    type="submit"
                    disabled={!manualCouponCode.trim()}
                    className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition-colors disabled:opacity-50"
                  >
                    Apply
                  </button>
                </form>

                {loadingCoupons ? (
                  <div className="flex justify-center items-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Available Coupons */}
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                        Available Coupons ({eligibleCoupons.available?.length || 0})
                      </h4>
                      {(!eligibleCoupons.available || eligibleCoupons.available.length === 0) ? (
                        <p className="text-xs text-gray-400 italic">No coupons available for your current order value.</p>
                      ) : (
                        <div className="space-y-3">
                          {sortCoupons(eligibleCoupons.available).map((coupon) => {
                            const isVip = coupon.minLifetimeSpending > 0
                            const isBest = coupon.code === getBestCoupon(eligibleCoupons.available)?.code
                            return (
                              <div
                                key={coupon._id}
                                className={`border rounded-2xl p-4 flex flex-col justify-between transition-all relative overflow-hidden ${
                                  isBest
                                    ? 'border-orange-500 dark:border-orange-600 shadow-[0_0_15px_rgba(249,115,22,0.2)] bg-gradient-to-br from-orange-50/30 to-amber-50/10 dark:from-orange-950/10 dark:to-gray-900'
                                    : isVip
                                    ? 'border-yellow-450 dark:border-yellow-600/70 shadow-[0_0_12px_rgba(234,179,8,0.15)] bg-gradient-to-br from-amber-50/20 to-yellow-50/5 dark:from-yellow-950/10 dark:to-gray-900 hover:border-yellow-500'
                                    : 'border-gray-150 dark:border-gray-800 hover:border-orange-300 dark:hover:border-orange-900'
                                }`}
                              >
                                {isBest && (
                                  <div className="absolute top-0 right-0 bg-gradient-to-l from-orange-500 to-amber-500 text-white text-[8px] font-extrabold px-3 py-1 rounded-bl-xl uppercase tracking-wider flex items-center gap-1 shadow-sm">
                                    <Sparkles size={8} className="animate-pulse" /> Best Deal
                                  </div>
                                )}
                                <div className="flex justify-between items-start gap-4">
                                  <div className="flex-1 min-w-0">
                                    {renderBadges(coupon)}
                                    <h5 className="font-bold text-foreground text-sm mt-2.5">{coupon.title}</h5>
                                    <p className="text-[10px] text-orange-500 font-semibold mt-1">
                                      {getExpiryMessage(coupon)}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-2">{coupon.description}</p>
                                  </div>
                                  <button
                                    onClick={() => handleApplyCoupon(coupon.code)}
                                    className="text-xs font-bold text-orange-500 hover:text-orange-650 bg-orange-50 dark:bg-orange-950/30 hover:bg-orange-100 px-3 py-1.5 rounded-xl border border-orange-200 dark:border-orange-900 transition-colors shrink-0 font-sans"
                                  >
                                    Apply
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    {/* Locked Coupons */}
                    {eligibleCoupons.locked?.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1">
                          <Lock size={12} /> Locked Coupons ({eligibleCoupons.locked.length})
                        </h4>
                        <div className="space-y-3">
                          {sortCoupons(eligibleCoupons.locked).map((coupon) => {
                            const isVip = coupon.minLifetimeSpending > 0
                            return (
                              <div
                                key={coupon._id}
                                className={`border rounded-2xl p-4 opacity-85 transition-opacity ${
                                  isVip
                                    ? 'border-yellow-450 dark:border-yellow-600/50 shadow-[0_0_10px_rgba(234,179,8,0.1)] bg-gradient-to-br from-amber-50/10 to-yellow-50/5 dark:from-yellow-950/5 dark:to-gray-900'
                                    : 'border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/40'
                                }`}
                              >
                                <div className="flex justify-between items-start gap-4">
                                  <div className="flex-1 min-w-0">
                                    {renderBadges(coupon)}
                                    <h5 className="font-bold text-gray-500 dark:text-gray-400 text-sm flex items-center gap-1.5 mt-2.5">
                                      <Lock size={13} className="text-gray-400 flex-shrink-0" />
                                      <span>{coupon.title}</span>
                                    </h5>
                                    <p className="text-[10px] text-gray-400 dark:text-gray-500 font-mono mt-0.5">CODE: {coupon.code}</p>
                                    <p className="text-xs text-muted-foreground mt-2">{coupon.description}</p>
                                  </div>
                                  <div className="text-gray-300 dark:text-gray-700 shrink-0">
                                    <Lock size={18} />
                                  </div>
                                </div>

                                {/* Lock Reasons & Progress Bars */}
                                <div className="mt-4">
                                  {coupon.isFirstOrderOnlyUnmet ? (
                                    <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-xl p-3 text-[11px] text-red-600 dark:text-red-400 font-medium">
                                      Only for first-time users. Place your first order with us to unlock this deal!
                                    </div>
                                  ) : coupon.isWeekendOnlyUnmet ? (
                                    <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 rounded-xl p-3 text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                                      Weekend Special. This coupon is only valid on Saturdays and Sundays.
                                    </div>
                                  ) : coupon.isPremiumOnlyUnmet ? (
                                    <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/40 rounded-xl p-3 text-[11px] text-purple-600 dark:text-purple-400 font-medium">
                                      Premium Exclusive. Add at least one Special/Premium pizza from our menu to your cart to unlock!
                                    </div>
                                  ) : (
                                    <div className="bg-gray-50 dark:bg-gray-950/60 p-3 rounded-xl border border-gray-100 dark:border-gray-800/40 space-y-3">
                                      {coupon.isLifetimeSpendingUnmet && (
                                        <div>
                                          <div className="flex justify-between text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1">
                                            <span>{isVip ? "You're close to unlocking VIP rewards!" : "Lifetime Spend Required"}</span>
                                            <span className="text-orange-500 font-bold">₹{eligibleCoupons.lifetimeSpent} / ₹{coupon.minLifetimeSpending}</span>
                                          </div>
                                          <div className="w-full bg-gray-200 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden">
                                            <div className="bg-orange-500 h-full rounded-full transition-all duration-500" style={{ width: `${coupon.lifetimeSpentProgress}%` }} />
                                          </div>
                                          <p className="text-[10px] text-gray-550 dark:text-gray-500 mt-1">
                                            Spend <strong className="text-orange-500 font-bold">₹{coupon.neededLifetimeSpent}</strong> more lifetime to unlock this deal.
                                          </p>
                                        </div>
                                      )}

                                      {coupon.isCartValueUnmet && (
                                        <div>
                                          <div className="flex justify-between text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1">
                                            <span>Minimum Cart Required (₹{coupon.minCartValue})</span>
                                            <span className="text-orange-500 font-bold">₹{eligibleCoupons.cartSubtotal} / ₹{coupon.minCartValue}</span>
                                          </div>
                                          <div className="w-full bg-gray-200 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden">
                                            <div className="bg-orange-500 h-full rounded-full transition-all duration-500" style={{ width: `${coupon.cartProgress}%` }} />
                                          </div>
                                          <p className="text-[10px] text-gray-550 dark:text-gray-500 mt-1">
                                            Add <strong className="text-orange-500 font-bold">₹{coupon.neededCartAmount}</strong> more to cart to apply.
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
