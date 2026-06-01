import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Star, Truck, Clock, Shield, ChefHat, Flame } from 'lucide-react'
import Navbar from '../../components/layout/Navbar'
import Footer from '../../components/layout/Footer'
import PizzaCard from '../../components/pizza/PizzaCard'
import { SkeletonCard } from '../../components/ui/Skeleton'
import { getFeaturedPizzas } from '../../api/pizza'
import { getSettings } from '../../api/setting'

import '../../components/pizza/pureVegBadge.css'

const HERO_IMAGES = [
  'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&auto=format&fit=crop',
]

const stats = [
  { value: '50K+', label: 'Happy Customers', icon: '😊' },
  { value: '100+', label: 'Pizza Varieties', icon: '🍕' },
  { value: '30 min', label: 'Avg Delivery', icon: '⚡' },
  { value: '4.8★', label: 'App Rating', icon: '⭐' },
]

const howItWorks = [
  { step: '01', title: 'Choose Your Pizza', desc: 'Browse our menu or build your own custom pizza with fresh ingredients.', icon: '🍕' },
  { step: '02', title: 'Place Your Order', desc: 'Add to cart, apply coupons, and pay securely via Razorpay.', icon: '🛒' },
  { step: '03', title: 'Track & Enjoy', desc: 'Track your order in real-time and enjoy hot, fresh pizza at your door.', icon: '🛵' },
]

const categories = [
  { name: 'All Pizzas', emoji: '🍕', desc: 'Browse our full collection', color: 'from-orange-400 to-red-500', slug: '' },
  { name: 'Classic', emoji: '🍕', desc: 'Timeless pizza favorites', color: 'from-orange-400 to-amber-500', slug: 'classic' },
  { name: 'Cheese', emoji: '🧀', desc: 'Extra cheesy goodness', color: 'from-yellow-400 to-orange-500', slug: 'cheese' },
  { name: 'Italian', emoji: '🇮🇹', desc: 'Authentic Italian recipes', color: 'from-green-400 to-emerald-500', slug: 'italian' },
  { name: 'Mexican', emoji: '🌶️', desc: 'Bold Mexican flavors', color: 'from-red-400 to-rose-500', slug: 'mexican' },
  { name: 'Indian Fusion', emoji: '🇮🇳', desc: 'Desi meets pizza', color: 'from-amber-400 to-orange-500', slug: 'indian-fusion' },
  { name: 'Spicy', emoji: '🔥', desc: 'For the heat lovers', color: 'from-rose-400 to-red-600', slug: 'spicy' },
  { name: 'Premium', emoji: '👑', desc: 'Gourmet ingredients', color: 'from-purple-400 to-violet-500', slug: 'premium' },
  { name: 'Signature', emoji: '⭐', desc: "Chef's special creations", color: 'from-indigo-400 to-purple-500', slug: 'signature' },
  { name: 'Build Your Own', emoji: '🎨', desc: 'Your pizza, your way', color: 'from-orange-400 to-yellow-500', slug: 'build' },
]

const testimonials = [
  { name: 'Priya Sharma', rating: 5, text: 'Best pizza in the city! Always fresh and delivered super fast. The custom builder is genius!', avatar: 'PS' },
  { name: 'Rahul Mehta', rating: 5, text: 'Love the variety of options. The Paneer Tikka pizza is absolutely amazing. Highly recommend!', avatar: 'RM' },
  { name: 'Ananya Patel', rating: 5, text: 'Ordered 10+ times now. Never disappointed. The app is smooth and tracking is real-time!', avatar: 'AP' },
]

const containerVariants = { hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }
const itemVariants = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } }

export default function HomePage() {
  const [featuredPizzas, setFeaturedPizzas] = useState([])
  const [loadingFeatured, setLoadingFeatured] = useState(true)
  const [heroIdx, setHeroIdx] = useState(0)
  const [freeDeliveryThreshold, setFreeDeliveryThreshold] = useState(499)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const { data } = await getFeaturedPizzas()
        setFeaturedPizzas(data.data?.pizzas || [])
      } catch {
        setFeaturedPizzas([])
      } finally {
        setLoadingFeatured(false)
      }
    }
    const fetchSettings = async () => {
      try {
        const { data } = await getSettings()
        const settings = data.data || {}
        if (typeof settings.freeDeliveryThreshold === 'number') {
          setFreeDeliveryThreshold(settings.freeDeliveryThreshold)
        }
      } catch (err) {
        console.error('Failed to load store settings:', err)
      }
    }
    fetchFeatured()
    fetchSettings()
    const interval = setInterval(() => setHeroIdx(i => (i + 1) % HERO_IMAGES.length), 4000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center overflow-hidden pt-16">
        <div className="absolute inset-0 z-0">
          {HERO_IMAGES.map((img, i) => (
            <motion.div key={i} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: heroIdx === i ? 1 : 0 }} transition={{ duration: 1 }}>
              <img src={img} alt="pizza" className="w-full h-full object-cover" />
            </motion.div>
          ))}
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="max-w-2xl">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/30 text-orange-500 rounded-full px-4 py-2 text-sm font-medium mb-4">
              <Flame className="w-4 h-4" /> Free delivery on orders above ₹{freeDeliveryThreshold}
            </motion.div>
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 }}
              className="block mb-6">
              <span className="pure-veg-trust-banner--light">🟢 100% Pure Vegetarian Kitchen</span>
            </motion.div>
            <h1 className="text-5xl lg:text-7xl font-display font-bold text-foreground leading-tight mb-6">
              Hot & Fresh<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500">Pizza Delivered</span><br />
              in 30 Minutes
            </h1>
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              Handcrafted with love, delivered with speed. Choose from 100+ varieties or build your own custom pizza.
            </p>
            <div className="flex flex-wrap gap-4">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link to="/menu" className="inline-flex items-center gap-2 py-4 px-8 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold text-lg shadow-xl shadow-orange-500/30 hover:shadow-orange-500/50 transition-all">
                  Order Now <ArrowRight className="w-5 h-5" />
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link to="/build" className="inline-flex items-center gap-2 py-4 px-8 rounded-2xl border-2 border-orange-500 text-orange-500 font-semibold text-lg hover:bg-orange-500 hover:text-white transition-all">
                  <ChefHat className="w-5 h-5" /> Build Your Own
                </Link>
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 1.5, repeat: Infinity }} className="absolute bottom-8 left-1/2 -translate-x-1/2 text-muted-foreground text-xs flex flex-col items-center gap-1">
          <div className="w-0.5 h-8 bg-gradient-to-b from-orange-500 to-transparent rounded-full" />
          Scroll down
        </motion.div>
      </section>

      {/* Stats */}
      <section className="py-16 bg-gradient-to-r from-orange-500 to-red-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={containerVariants} initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map(({ value, label, icon }) => (
              <motion.div key={label} variants={itemVariants} className="text-center text-white">
                <div className="text-4xl mb-2">{icon}</div>
                <div className="text-3xl font-display font-bold mb-1">{value}</div>
                <div className="text-white/80 text-sm">{label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
          <h2 className="text-4xl font-display font-bold text-foreground mb-3">What Are You Craving?</h2>
          <p className="text-muted-foreground text-lg">Pick your style and let us handle the rest</p>
        </motion.div>
        <motion.div variants={containerVariants} initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {categories.map(({ name, emoji, desc, color, slug }) => (
            <motion.div key={name} variants={itemVariants} whileHover={{ scale: 1.05, y: -4 }}>
              <Link to={slug === 'build' ? '/build' : `/menu?category=${slug}`}
                className={`block rounded-2xl p-6 bg-gradient-to-br ${color} text-white shadow-lg hover:shadow-xl transition-all`}>
                <div className="text-5xl mb-3">{emoji}</div>
                <h3 className="font-display font-bold text-lg mb-1">{name}</h3>
                <p className="text-white/80 text-sm">{desc}</p>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Featured Pizzas */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="flex items-end justify-between mb-12">
          <div>
            <h2 className="text-4xl font-display font-bold text-foreground mb-3">Fan Favorites</h2>
            <p className="text-muted-foreground text-lg">Our most loved, most ordered pizzas</p>
          </div>
          <Link to="/menu" className="text-orange-500 font-semibold hover:text-orange-600 flex items-center gap-1">View all <ArrowRight className="w-4 h-4" /></Link>
        </motion.div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {loadingFeatured
            ? Array(6).fill(0).map((_, i) => <SkeletonCard key={i} />)
            : featuredPizzas.slice(0, 6).map((pizza, i) => (
              <motion.div key={pizza._id} variants={itemVariants} initial="hidden" whileInView="visible" viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                <PizzaCard pizza={pizza} />
              </motion.div>
            ))
          }
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <h2 className="text-4xl font-display font-bold text-foreground mb-3">How It Works</h2>
            <p className="text-muted-foreground text-lg">Order in 3 simple steps</p>
          </motion.div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {howItWorks.map(({ step, title, desc, icon }, i) => (
              <motion.div key={step} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15 }}
                className="text-center relative">
                <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center text-4xl mx-auto mb-6 shadow-lg shadow-orange-500/30">
                  {icon}
                </div>
                <div className="text-6xl font-display font-black text-orange-500/10 absolute -top-4 left-1/2 -translate-x-1/2">{step}</div>
                <h3 className="text-xl font-display font-bold text-foreground mb-3">{title}</h3>
                <p className="text-muted-foreground leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
          <h2 className="text-4xl font-display font-bold text-foreground mb-3">What Our Customers Say</h2>
          <p className="text-muted-foreground text-lg">Trusted by 50,000+ pizza lovers</p>
        </motion.div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {testimonials.map(({ name, rating, text, avatar }, i) => (
            <motion.div key={name} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15 }}
              className="bg-card border border-border rounded-2xl p-6 hover:shadow-lg transition-all">
              <div className="flex gap-1 mb-4">
                {Array(rating).fill(0).map((_, j) => <Star key={j} className="w-4 h-4 fill-orange-400 text-orange-400" />)}
              </div>
              <p className="text-muted-foreground mb-6 leading-relaxed">"{text}"</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white text-sm font-bold">{avatar}</div>
                <span className="font-semibold text-foreground">{name}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-20 bg-gradient-to-r from-orange-500 to-red-600 mx-4 sm:mx-6 lg:mx-8 rounded-3xl mb-20">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} className="text-center text-white px-4">
          <div className="text-6xl mb-6">🍕</div>
          <h2 className="text-4xl font-display font-bold mb-4">Ready to Order?</h2>
          <p className="text-white/80 text-lg mb-8">Your perfect pizza is just a few clicks away</p>
          <div className="flex gap-4 justify-center flex-wrap">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link to="/menu" className="inline-flex items-center gap-2 py-4 px-8 rounded-xl bg-white text-orange-600 font-bold text-lg hover:bg-orange-50 transition-colors shadow-xl">
                Order Now <ArrowRight className="w-5 h-5" />
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link to="/build" className="inline-flex items-center gap-2 py-4 px-8 rounded-xl border-2 border-white text-white font-bold text-lg hover:bg-white/10 transition-colors">
                <ChefHat className="w-5 h-5" /> Build Custom
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </section>

      <Footer />
    </div>
  )
}
