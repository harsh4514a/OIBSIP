import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Ticket, Gift, Award, Lock, CheckCircle, AlertTriangle, ArrowRight, Clipboard, Hourglass, Sparkles, Star, Crown } from 'lucide-react';
import Navbar from '../../components/layout/Navbar';
import Footer from '../../components/layout/Footer';
import { getEligibleCoupons } from '../../api/coupon';
import toast from 'react-hot-toast';

export default function MyCoupons() {
  const [coupons, setCoupons] = useState({ available: [], locked: [], used: [], expired: [] });
  const [lifetimeSpent, setLifetimeSpent] = useState(0);
  const [cartSubtotal, setCartSubtotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCouponsData = async () => {
      try {
        const res = await getEligibleCoupons();
        if (res.data.success) {
          setCoupons(res.data.data);
          setLifetimeSpent(res.data.data.lifetimeSpent || 0);
          setCartSubtotal(res.data.data.cartSubtotal || 0);
        }
      } catch (err) {
        toast.error('Failed to load coupons.');
      } finally {
        setLoading(false);
      }
    };
    fetchCouponsData();
  }, []);

  const copyToClipboard = (code) => {
    navigator.clipboard.writeText(code);
    toast.success(`Coupon code "${code}" copied to clipboard!`);
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getExpiryMessage = (coupon) => {
    if (coupon.isWeekendOnly) return 'Weekend Special ⚡';
    const now = new Date();
    const expiry = new Date(coupon.expiryDate);
    const diffTime = expiry - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 0) return 'Expired';
    if (diffDays === 1) {
      const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
      return `Expires in ${diffHours} hour${diffHours > 1 ? 's' : ''}! ⏳`;
    }
    if (diffDays <= 3) return `Expires in ${diffDays} days! 🔥`;
    return 'Limited Time Offer';
  };

  const getUsageRules = (coupon) => {
    const rules = [];
    if (coupon.usagePerUser === 1) rules.push('One-time use only');
    if (coupon.minLifetimeSpending > 0) rules.push('Valid once per month');
    if (coupon.isPremiumOnly) rules.push('Only for premium pizzas');
    if (coupon.isWeekendOnly) rules.push('Weekend orders only');
    rules.push('Cannot combine with other offers');
    return rules;
  };

  const sortCoupons = (list) => {
    return [...list].sort((a, b) => {
      // 1. New User Offers (isFirstOrderOnly)
      if (a.isFirstOrderOnly && !b.isFirstOrderOnly) return -1;
      if (!a.isFirstOrderOnly && b.isFirstOrderOnly) return 1;
      
      // 2. Daily Deals (neither VIP nor Premium/Weekend)
      const aIsVip = a.minLifetimeSpending > 0;
      const bIsVip = b.minLifetimeSpending > 0;
      const aIsPremiumOrWeekend = a.isPremiumOnly || a.isWeekendOnly;
      const bIsPremiumOrWeekend = b.isPremiumOnly || b.isWeekendOnly;
      
      const aIsDaily = !aIsVip && !aIsPremiumOrWeekend;
      const bIsDaily = !bIsVip && !bIsPremiumOrWeekend;
      if (aIsDaily && !bIsDaily) return -1;
      if (!aIsDaily && bIsDaily) return 1;

      // 3. Premium Deals / Weekend Specials
      if (aIsPremiumOrWeekend && !bIsPremiumOrWeekend) return -1;
      if (!aIsPremiumOrWeekend && bIsPremiumOrWeekend) return 1;

      // 4. VIP Rewards
      if (aIsVip && !bIsVip) return 1;
      if (!aIsVip && bIsVip) return -1;

      return 0;
    });
  };

  const renderBadges = (coupon) => {
    const badges = [];
    if (coupon.isFirstOrderOnly) {
      badges.push(
        <span key="new" className="bg-orange-50 text-orange-600 dark:bg-orange-950/20 dark:text-orange-400 border border-orange-200 dark:border-orange-900/50 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
          NEW USER
        </span>
      );
    }
    if (coupon.minLifetimeSpending > 0) {
      badges.push(
        <span key="vip" className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white border border-amber-400 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-sm">
          <Crown size={10} className="fill-current text-white animate-pulse" /> VIP
        </span>
      );
    }
    if (coupon.isWeekendOnly) {
      badges.push(
        <span key="weekend" className="bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
          WEEKEND SPECIAL
        </span>
      );
    }
    if (coupon.isPremiumOnly) {
      badges.push(
        <span key="premium" className="bg-purple-50 text-purple-600 dark:bg-purple-950/20 dark:text-purple-400 border border-purple-200 dark:border-purple-900/50 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
          PREMIUM
        </span>
      );
    }
    if (badges.length === 0) {
      badges.push(
        <span key="limited" className="bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400 border border-red-200 dark:border-red-900/50 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
          <Hourglass size={10} /> LIMITED TIME
        </span>
      );
    }
    return <div className="flex flex-wrap gap-1.5 mt-2">{badges}</div>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
        <Navbar />
        <div className="flex-1 pt-32 pb-12 flex justify-center items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
        </div>
        <Footer />
      </div>
    );
  }

  const sortedAvailable = sortCoupons(coupons.available || []);
  const sortedLocked = sortCoupons(coupons.locked || []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col font-sans transition-colors duration-300">
      <Navbar />

      <main className="flex-1 pt-24 pb-16 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        {/* Banner Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative bg-gradient-to-r from-orange-500 via-orange-600 to-red-600 rounded-3xl p-6 sm:p-10 text-white shadow-xl overflow-hidden mb-12"
        >
          {/* Decorative shapes */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full -ml-16 -mb-16 blur-xl"></div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="max-w-xl">
              <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
                🍕 PizzaHub Rewards
              </span>
              <h1 className="text-3xl sm:text-4xl font-display font-extrabold mt-3 leading-tight">
                Claim Your Deals & Eat Smarter
              </h1>
              <p className="text-white/85 text-sm sm:text-base mt-2">
                Order your favorite pizzas and unlock exclusive loyalty rewards. Your current lifetime spending with us is{' '}
                <strong className="text-white underline">₹{lifetimeSpent.toLocaleString()}</strong>.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 items-stretch md:items-center">
              <div className="bg-white/10 backdrop-blur-md border border-white/25 rounded-2xl p-4 text-center">
                <p className="text-xs text-white/70 uppercase font-medium">Lifetime Spent</p>
                <p className="text-2xl font-bold font-display mt-0.5">₹{lifetimeSpent}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md border border-white/25 rounded-2xl p-4 text-center">
                <p className="text-xs text-white/70 uppercase font-medium">Active Cart</p>
                <p className="text-2xl font-bold font-display mt-0.5">₹{cartSubtotal}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* 1. Available Coupons */}
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-950/50 flex items-center justify-center text-orange-500">
              <Ticket size={18} />
            </div>
            <h2 className="text-xl font-display font-bold text-gray-900 dark:text-white">
              Available Coupons ({sortedAvailable.length})
            </h2>
          </div>

          {sortedAvailable.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-8 text-center text-gray-500 dark:text-gray-400">
              <Gift className="mx-auto w-12 h-12 text-gray-350 mb-3" />
              <p className="text-sm">No coupons available for your current cart value. Add items to cart to unlock coupons!</p>
              <Link to="/menu" className="inline-flex items-center gap-1.5 text-orange-500 hover:text-orange-600 font-semibold text-sm mt-4">
                Explore Menu <ArrowRight size={14} />
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {sortedAvailable.map((coupon) => {
                const isVip = coupon.minLifetimeSpending > 0;
                return (
                  <motion.div
                    key={coupon._id}
                    whileHover={{ y: -6, scale: 1.01 }}
                    className={`relative bg-white dark:bg-gray-900 border rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all flex flex-col justify-between ${
                      isVip 
                        ? 'border-amber-400 dark:border-amber-500/80 shadow-[0_0_20px_rgba(245,158,11,0.22)] shadow-amber-500/20 bg-gradient-to-br from-amber-50/40 via-yellow-50/10 to-orange-50/5 dark:from-yellow-950/15 dark:via-orange-950/5 dark:to-gray-900 min-h-[360px]' 
                        : 'border-gray-100 dark:border-gray-800'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          {renderBadges(coupon)}
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white mt-2.5">{coupon.title}</h3>
                          <p className="text-xs text-orange-500 font-semibold mt-1">
                            {getExpiryMessage(coupon)}
                          </p>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-xs font-bold text-orange-500 uppercase tracking-wider">
                            {coupon.discountType === 'percentage' ? `${coupon.discountValue}% OFF` : `₹${coupon.discountValue} OFF`}
                          </span>
                          {coupon.maxDiscount && (
                            <span className="text-[10px] text-gray-405 dark:text-gray-500">Max ₹{coupon.maxDiscount}</span>
                          )}
                        </div>
                      </div>

                      <p className="text-sm text-gray-600 dark:text-gray-305 mt-3">{coupon.description}</p>

                      {/* Rule Badges */}
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {getUsageRules(coupon).map((rule, idx) => (
                          <span key={idx} className="bg-gray-50 dark:bg-gray-800/40 text-[10px] text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded border border-gray-100 dark:border-gray-850 font-medium">
                            • {rule}
                          </span>
                        ))}
                      </div>

                      {coupon.terms && coupon.terms.length > 0 && (
                        <div className="mt-4 border-t border-gray-100 dark:border-gray-800 pt-3">
                          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Terms & Conditions</p>
                          <ul className="list-disc list-inside text-xs text-gray-550 dark:text-gray-400 space-y-1 mt-1">
                            {coupon.terms.map((term, i) => (
                              <li key={i}>{term}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3 mt-6">
                      <div className="flex-1 flex items-center justify-between bg-orange-50 dark:bg-orange-950/20 border border-dashed border-orange-200 dark:border-orange-900/60 rounded-xl px-4 py-2 text-sm">
                        <span className="font-mono font-bold text-orange-600 dark:text-orange-400 select-all">
                          {coupon.code}
                        </span>
                        <button
                          onClick={() => copyToClipboard(coupon.code)}
                          className="text-orange-500 hover:text-orange-600 p-1 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-950 transition-colors"
                          title="Copy Code"
                        >
                          <Clipboard size={16} />
                        </button>
                      </div>
                      <Link
                        to="/cart"
                        className="bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition-colors shadow-md shadow-orange-500/10 flex items-center gap-1 shrink-0"
                      >
                        Apply Coupon <ArrowRight size={14} />
                      </Link>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </section>

        {/* 2. Locked Coupons */}
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-950/50 flex items-center justify-center text-orange-500">
              <Lock size={18} />
            </div>
            <h2 className="text-xl font-display font-bold text-gray-900 dark:text-white">
              Locked Coupons ({sortedLocked.length})
            </h2>
          </div>

          {sortedLocked.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 text-center text-gray-400 text-sm">
              No locked coupons right now. You have unlocked all active promotions!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {sortedLocked.map((coupon) => {
                const isVip = coupon.minLifetimeSpending > 0;
                return (
                  <div
                    key={coupon._id}
                    className={`bg-white dark:bg-gray-900 border rounded-2xl p-6 shadow-sm opacity-90 hover:opacity-100 hover:shadow-lg transition-all flex flex-col justify-between ${
                      isVip
                        ? 'border-amber-400 dark:border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.15)] shadow-amber-500/10 bg-gradient-to-br from-amber-50/25 via-yellow-50/5 to-orange-50/5 dark:from-yellow-950/10 dark:via-orange-950/5 dark:to-gray-900 min-h-[360px]'
                        : 'border-gray-100 dark:border-gray-800'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          {renderBadges(coupon)}
                          <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-1.5 mt-2.5">
                            <Lock size={14} className="text-gray-400 flex-shrink-0" />
                            <span>{coupon.title}</span>
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-mono">
                            CODE: {coupon.code}
                          </p>
                        </div>
                        <div className="flex flex-col items-end shrink-0">
                          <span className="text-xs font-bold text-gray-450 dark:text-gray-500 uppercase tracking-wider">
                            {coupon.discountType === 'percentage' ? `${coupon.discountValue}% OFF` : `₹${coupon.discountValue} OFF`}
                          </span>
                          {coupon.maxDiscount && (
                            <span className="text-[10px] text-gray-400 dark:text-gray-500">Max ₹{coupon.maxDiscount}</span>
                          )}
                        </div>
                      </div>

                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-3">{coupon.description}</p>

                      {/* Lock Reason / Requirements */}
                      <div className="mt-5 space-y-3">
                        {coupon.isFirstOrderOnlyUnmet ? (
                          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-xl p-3.5 text-xs text-red-600 dark:text-red-400 font-semibold flex items-center gap-1.5">
                            <span>Only for first-time users. Place your first order with us to unlock this deal!</span>
                          </div>
                        ) : coupon.isWeekendOnlyUnmet ? (
                          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 rounded-xl p-3.5 text-xs text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1.5">
                            <span>Weekend Special. This coupon is only valid on Saturdays and Sundays.</span>
                          </div>
                        ) : coupon.isPremiumOnlyUnmet ? (
                          <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/50 rounded-xl p-3.5 text-xs text-purple-600 dark:text-purple-400 font-semibold flex items-center gap-1.5">
                            <span>Premium Exclusive. Add at least one Special/Premium pizza from our menu to your cart to unlock!</span>
                          </div>
                        ) : (
                          <div className="bg-gray-50 dark:bg-gray-950 p-3.5 rounded-xl border border-gray-100 dark:border-gray-800/40 space-y-3">
                            {coupon.isLifetimeSpendingUnmet && (
                              <div>
                                <div className="flex justify-between text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                                  <span>{isVip ? "You're close to unlocking VIP rewards!" : "Lifetime Spend Required"}</span>
                                  <span className="text-orange-550 font-bold">₹{lifetimeSpent} / ₹{coupon.minLifetimeSpending}</span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
                                  <div className="bg-orange-500 h-full rounded-full transition-all duration-500" style={{ width: `${coupon.lifetimeSpentProgress}%` }} />
                                </div>
                                <p className="text-[10px] text-gray-450 dark:text-gray-500 mt-1">
                                  Spend <strong className="text-orange-500 font-bold">₹{coupon.neededLifetimeSpent}</strong> more lifetime to unlock this deal.
                                </p>
                              </div>
                            )}

                            {coupon.isCartValueUnmet && (
                              <div>
                                <div className="flex justify-between text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                                  <span>Minimum Order Value (₹{coupon.minCartValue})</span>
                                  <span className="text-orange-550 font-bold">₹{cartSubtotal} / ₹{coupon.minCartValue}</span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
                                  <div className="bg-orange-500 h-full rounded-full transition-all duration-500" style={{ width: `${coupon.cartProgress}%` }} />
                                </div>
                                <p className="text-[10px] text-gray-450 dark:text-gray-500 mt-1">
                                  Add <strong className="text-orange-500 font-bold">₹{coupon.neededCartAmount}</strong> more to your cart to apply this coupon.
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-5 border-t border-gray-100 dark:border-gray-800 pt-3 flex items-center justify-between text-xs text-gray-400">
                      <span>{getExpiryMessage(coupon)}</span>
                      {!coupon.isFirstOrderOnlyUnmet && !coupon.isWeekendOnlyUnmet && !coupon.isPremiumOnlyUnmet && (
                        <Link
                          to={coupon.isCartValueUnmet ? '/menu' : '/cart'}
                          className="text-orange-500 hover:text-orange-600 font-semibold flex items-center gap-1"
                        >
                          {coupon.isCartValueUnmet ? 'Shop to Unlock' : 'Unlock Now'} <ArrowRight size={12} />
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* 3. Used & Expired Section (Two Columns) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Used Coupons */}
          <div>
            <div className="flex items-center gap-2 mb-6">
              <div className="w-7 h-7 rounded-lg bg-green-50 dark:bg-green-950/20 flex items-center justify-center text-green-500">
                <CheckCircle size={16} />
              </div>
              <h2 className="text-lg font-display font-bold text-gray-900 dark:text-white">
                Used Coupons ({coupons.used.length})
              </h2>
            </div>

            {coupons.used.length === 0 ? (
              <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-8 text-center text-gray-400/80">
                <div className="w-12 h-12 rounded-full bg-green-50 dark:bg-green-950/20 flex items-center justify-center text-green-500 mx-auto mb-3">
                  <Award size={24} />
                </div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">No Claimed Rewards Yet</p>
                <p className="text-xs text-gray-500 mt-1">Order delicious pizzas and apply coupons at checkout to unlock savings!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {coupons.used.map((coupon) => (
                  <div
                    key={coupon._id}
                    className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-4 shadow-sm opacity-60 flex justify-between items-center"
                  >
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white">{coupon.title}</h4>
                      <p className="text-xs text-gray-400 font-mono mt-0.5">CODE: {coupon.code}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{coupon.description}</p>
                    </div>
                    <span className="bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400 text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0">
                      CLAIMED
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Expired / Inactive Coupons */}
          <div>
            <div className="flex items-center gap-2 mb-6">
              <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-850/40 flex items-center justify-center text-gray-400">
                <AlertTriangle size={16} />
              </div>
              <h2 className="text-lg font-display font-bold text-gray-900 dark:text-white">
                Expired Coupons ({coupons.expired.length})
              </h2>
            </div>

            {coupons.expired.length === 0 ? (
              <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-8 text-center text-gray-400/80">
                <div className="w-12 h-12 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-400 mx-auto mb-3">
                  <Ticket size={24} />
                </div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">No Expired Offers</p>
                <p className="text-xs text-gray-500 mt-1 font-medium">Good news! All your promotional deals are still active and waiting for you.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {coupons.expired.map((coupon) => (
                  <div
                    key={coupon._id}
                    className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-4 shadow-sm opacity-60 flex justify-between items-center"
                  >
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white">{coupon.title}</h4>
                      <p className="text-xs text-gray-400 font-mono mt-0.5">CODE: {coupon.code}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{coupon.description}</p>
                    </div>
                    <span className="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0">
                      {coupon.reason.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
