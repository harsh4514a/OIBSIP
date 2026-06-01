import { useState } from 'react'
import { motion } from 'framer-motion'
import { Heart, ShoppingCart, Star } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../../hooks/useCart'
import { useAuth } from '../../hooks/useAuth'
import { formatCurrency, truncate } from '../../lib/utils'
import toast from 'react-hot-toast'

export default function PizzaCard({ pizza, showWishlistBtn, onWishlistChange }) {
  const [addingToCart, setAddingToCart] = useState(false)
  const { addToCart } = useCart()
  const { user } = useAuth()
  const navigate = useNavigate()

  if (!pizza) return null

  const {
    _id,
    name,
    description,
    basePrice,
    image,
    category = 'classic',
    ratings = { average: 4.5, count: 0 },
    isAvailable = true,
    isFeatured = false,
  } = pizza

  const imageUrl = image || `https://picsum.photos/seed/${_id || name}/400/300`

  const handleAddToCart = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!user) {
      navigate('/auth/login')
      return
    }
    setAddingToCart(true)
    try {
      await addToCart({ pizzaId: _id, size: 'medium', quantity: 1, type: 'regular' })
      toast.success(`${name} added to cart! 🛒`)
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to add to cart')
    } finally {
      setAddingToCart(false)
    }
  }

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ duration: 0.2 }}
      className="group relative rounded-2xl bg-card border border-border overflow-hidden shadow-sm hover:shadow-xl hover:shadow-orange-500/10 transition-all duration-300"
    >
      <Link to={`/menu/${_id}`} className="block">
        {/* Image */}
        <div className="relative overflow-hidden h-48 bg-muted">
          <img
            src={imageUrl}
            alt={name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
            onError={(e) => { e.target.src = `https://picsum.photos/seed/${_id}/400/300` }}
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          {/* Featured */}
          {isFeatured && (
            <div className="absolute top-3 right-3">
              <span className="px-2 py-0.5 rounded-lg bg-orange-500 text-white text-[10px] font-bold">⭐ Featured</span>
            </div>
          )}

          {/* Unavailable overlay */}
          {!isAvailable && (
            <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
              <span className="px-3 py-1 bg-background border border-border rounded-xl text-sm font-semibold text-muted-foreground">Unavailable</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Rating & Pure Veg */}
          <div className="flex items-center gap-1.5 mb-2">
            <Star className="w-3.5 h-3.5 fill-orange-400 text-orange-400" />
            <span className="text-xs font-semibold text-foreground">{(ratings?.average || 4.5).toFixed(1)}</span>
            <span className="text-xs text-muted-foreground">({ratings?.count || 0})</span>
            <span className="pure-veg-badge ml-auto">🟢 Pure Veg</span>
          </div>

          {/* Name */}
          <h3 className="font-display font-semibold text-foreground text-base mb-1.5 group-hover:text-orange-500 transition-colors line-clamp-1">
            {name}
          </h3>

          {/* Description */}
          <p className="text-xs text-muted-foreground mb-4 leading-relaxed line-clamp-2">
            {truncate(description || 'Delicious pizza made with the finest fresh ingredients', 70)}
          </p>

          {/* Price */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Starting from</p>
              <p className="text-lg font-display font-bold text-orange-500">
                {formatCurrency(basePrice || 199)}
              </p>
            </div>
          </div>
        </div>
      </Link>

      {/* Action Buttons */}
      <div className="px-4 pb-4">
        <button
          onClick={handleAddToCart}
          disabled={addingToCart || !isAvailable}
          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm font-semibold flex items-center justify-center gap-2 hover:from-orange-600 hover:to-orange-700 transition-all shadow-sm shadow-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {addingToCart
            ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : <ShoppingCart className="w-4 h-4" />}
          {addingToCart ? 'Adding...' : 'Add to Cart'}
        </button>
      </div>
    </motion.div>
  )
}
