import { useEffect, useState } from 'react'
import '../../components/pizza/pureVegBadge.css'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Star, ShoppingCart, Heart, ChefHat, ArrowLeft, Plus, Minus } from 'lucide-react'
import Navbar from '../../components/layout/Navbar'
import Footer from '../../components/layout/Footer'
import { SkeletonCard } from '../../components/ui/Skeleton'
import StarRating from '../../components/ui/StarRating'
import PizzaCard from '../../components/pizza/PizzaCard'
import { getPizzaById, getAllPizzas } from '../../api/pizza'
import { useCart } from '../../hooks/useCart'
import { useAuth } from '../../hooks/useAuth'
import { getPizzaReviews } from '../../api/review'
import { addToWishlist, removeFromWishlist } from '../../api/auth'
import toast from 'react-hot-toast'
import { formatCurrency, formatDate } from '../../lib/utils'

const SIZE_MAP = { small: 'Small (8")', medium: 'Medium (10")', large: 'Large (12")', xl: 'XL (14")' }

export default function PizzaDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { addToCart } = useCart()
  const { user } = useAuth()
  const [pizza, setPizza] = useState(null)
  const [reviews, setReviews] = useState([])
  const [related, setRelated] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedSize, setSelectedSize] = useState('medium')
  const [quantity, setQuantity] = useState(1)
  const [wishlisted, setWishlisted] = useState(false)
  const [addingToCart, setAddingToCart] = useState(false)

  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      try {
        const [{ data: pizzaData }, { data: reviewData }] = await Promise.all([
          getPizzaById(id),
          getPizzaReviews(id),
        ])
        setPizza(pizzaData.data?.pizza || pizzaData.data)
        setReviews(reviewData.data?.reviews || [])
        if (user?.wishlist?.includes(id)) setWishlisted(true)
        const pizzaObj = pizzaData.data?.pizza || pizzaData.data
        const { data: relData } = await getAllPizzas({ category: pizzaObj?.category, limit: 4 })
        setRelated((relData.data?.pizzas || relData.data || []).filter(p => p._id !== id).slice(0, 3))
      } catch { toast.error('Failed to load pizza') }
      finally { setLoading(false) }
    }
    fetch()
    window.scrollTo(0, 0)
  }, [id])

  const getPrice = () => {
    if (!pizza) return 0
    const sizeObj = pizza.sizes?.find(s => s.size === selectedSize)
    return Math.round(pizza.basePrice * (sizeObj?.priceMultiplier || 1) * quantity)
  }

  const handleAddToCart = async () => {
    if (!user) return navigate('/auth/login')
    setAddingToCart(true)
    try {
      await addToCart({ pizzaId: pizza._id, size: selectedSize, quantity, type: 'regular' })
      toast.success('Added to cart! 🛒')
    } catch { toast.error('Failed to add to cart') }
    finally { setAddingToCart(false) }
  }

  const handleWishlist = async () => {
    if (!user) return navigate('/auth/login')
    try {
      if (wishlisted) { await removeFromWishlist(pizza._id); setWishlisted(false); toast.success('Removed from wishlist') }
      else { await addToWishlist(pizza._id); setWishlisted(true); toast.success('Added to wishlist ❤️') }
    } catch { toast.error('Failed to update wishlist') }
  }

  if (loading) return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 pt-24 pb-16"><div className="grid grid-cols-1 lg:grid-cols-2 gap-12"><SkeletonCard /><div className="space-y-4">{Array(5).fill(0).map((_, i) => <div key={i} className="h-8 bg-muted rounded-xl animate-pulse" />)}</div></div></div>
    </div>
  )

  if (!pizza) return null

  const avgRating = pizza.ratings?.average || 0
  const ratingCount = pizza.ratings?.count || 0

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
            <Link to="/" className="hover:text-foreground">Home</Link>
            <span>/</span>
            <Link to="/menu" className="hover:text-foreground">Menu</Link>
            <span>/</span>
            <span className="text-foreground">{pizza.name}</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
            {/* Image */}
            <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} className="relative">
              <div className="aspect-square rounded-3xl overflow-hidden bg-muted">
                <img src={pizza.image || `https://picsum.photos/seed/${pizza._id}/600/600`} alt={pizza.name} className="w-full h-full object-cover" />
              </div>
              <button onClick={handleWishlist} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow-md hover:scale-110 transition-transform">
                <Heart className={`w-5 h-5 ${wishlisted ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
              </button>
            </motion.div>

            {/* Details */}
            <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-3 flex-wrap">
                <div className="flex items-center gap-1">
                  {Array(5).fill(0).map((_, i) => <Star key={i} className={`w-4 h-4 ${i < Math.round(avgRating) ? 'fill-orange-400 text-orange-400' : 'text-gray-300'}`} />)}
                </div>
                <span className="text-sm font-semibold">{avgRating.toFixed(1)}</span>
                <span className="text-sm text-muted-foreground">({ratingCount} reviews)</span>
                <span className="pure-veg-badge--detail">🟢 100% Pure Veg</span>
              </div>

              <h1 className="text-4xl font-display font-bold text-foreground mb-4">{pizza.name}</h1>
              <p className="text-muted-foreground text-lg leading-relaxed mb-6">{pizza.description}</p>

              {/* Size */}
              <div className="mb-6">
                <p className="font-semibold text-foreground mb-3">Choose Size</p>
                <div className="grid grid-cols-4 gap-3">
                  {(pizza.sizes || [{ size: 'small', priceMultiplier: 0.8 }, { size: 'medium', priceMultiplier: 1 }, { size: 'large', priceMultiplier: 1.3 }, { size: 'xl', priceMultiplier: 1.6 }]).map(s => (
                    <button key={s.size} onClick={() => setSelectedSize(s.size)}
                      className={`py-3 px-2 rounded-xl border-2 text-sm font-medium transition-all text-center ${selectedSize === s.size ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-600' : 'border-border hover:border-orange-300'}`}>
                      <div className="font-bold capitalize">{s.size}</div>
                      <div className="text-xs text-muted-foreground">{formatCurrency(pizza.basePrice * s.priceMultiplier)}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantity */}
              <div className="mb-6">
                <p className="font-semibold text-foreground mb-3">Quantity</p>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3 bg-muted rounded-xl p-1">
                    <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="w-9 h-9 rounded-lg bg-background flex items-center justify-center hover:bg-orange-50 transition-colors">
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-8 text-center font-bold text-lg">{quantity}</span>
                    <button onClick={() => setQuantity(q => q + 1)} className="w-9 h-9 rounded-lg bg-background flex items-center justify-center hover:bg-orange-50 transition-colors">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <span className="text-2xl font-display font-bold text-orange-500">{formatCurrency(getPrice())}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <motion.button onClick={handleAddToCart} disabled={addingToCart} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="flex-1 py-4 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-orange-500/30 disabled:opacity-60">
                  {addingToCart ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <ShoppingCart className="w-5 h-5" />}
                  Add to Cart
                </motion.button>
                <motion.button onClick={() => navigate('/build')} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="px-6 py-4 rounded-xl border-2 border-orange-500 text-orange-500 font-semibold flex items-center gap-2 hover:bg-orange-500 hover:text-white transition-all">
                  <ChefHat className="w-5 h-5" /> Customize
                </motion.button>
              </div>

              {/* Ingredients */}
              {pizza.ingredients?.length > 0 && (
                <div className="mt-6 p-4 bg-muted/50 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold text-foreground">Ingredients</p>
                    <span className="pure-veg-badge">🟢 Fresh Vegetarian Ingredients</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {pizza.ingredients.map(ing => (
                      <span key={ing} className="px-2.5 py-1 bg-background border border-border rounded-lg text-xs text-muted-foreground">{ing}</span>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </div>

          {/* Reviews */}
          <div className="mb-16">
            <h2 className="text-2xl font-display font-bold text-foreground mb-8">Customer Reviews</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Rating summary */}
              <div className="bg-card border border-border rounded-2xl p-6 text-center">
                <div className="text-6xl font-display font-bold text-orange-500 mb-2">{avgRating.toFixed(1)}</div>
                <div className="flex justify-center gap-1 mb-2">
                  {Array(5).fill(0).map((_, i) => <Star key={i} className={`w-5 h-5 ${i < Math.round(avgRating) ? 'fill-orange-400 text-orange-400' : 'text-gray-300'}`} />)}
                </div>
                <div className="text-muted-foreground text-sm">{ratingCount} reviews</div>
              </div>

              {/* Reviews List */}
              <div className="lg:col-span-2">
                <div className="space-y-4">
                  {reviews.map(review => (
                    <div key={review._id} className="bg-card border border-border rounded-xl p-5">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white text-sm font-bold">
                          {review.user?.name?.[0] || 'U'}
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{review.user?.name || 'User'}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(review.createdAt)}</p>
                        </div>
                        <div className="ml-auto flex gap-0.5">
                          {Array(5).fill(0).map((_, i) => <Star key={i} className={`w-3.5 h-3.5 ${i < review.rating ? 'fill-orange-400 text-orange-400' : 'text-gray-300'}`} />)}
                        </div>
                      </div>
                      <p className="text-muted-foreground text-sm">{review.comment}</p>
                    </div>
                  ))}
                  {reviews.length === 0 && <p className="text-muted-foreground text-center py-8">No reviews yet for this pizza.</p>}
                </div>
              </div>
            </div>
          </div>

          {/* Related */}
          {related.length > 0 && (
            <div>
              <h2 className="text-2xl font-display font-bold text-foreground mb-6">You Might Also Like</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {related.map(p => <PizzaCard key={p._id} pizza={p} />)}
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  )
}
