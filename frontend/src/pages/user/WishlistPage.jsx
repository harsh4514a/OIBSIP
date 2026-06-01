import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Heart } from 'lucide-react'
import Navbar from '../../components/layout/Navbar'
import Footer from '../../components/layout/Footer'
import PizzaCard from '../../components/pizza/PizzaCard'
import EmptyState from '../../components/ui/EmptyState'
import { SkeletonCard } from '../../components/ui/Skeleton'
import { getWishlist } from '../../api/auth'
import { useNavigate } from 'react-router-dom'

export default function WishlistPage() {
  const [wishlist, setWishlist] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await getWishlist()
        setWishlist(data.data?.wishlist || [])
      } catch { setWishlist([]) }
      finally { setLoading(false) }
    }
    fetch()
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="py-8">
            <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
              <Heart className="w-8 h-8 text-red-500 fill-red-500" /> My Wishlist
              {wishlist.length > 0 && <span className="text-lg text-muted-foreground font-normal">({wishlist.length} items)</span>}
            </h1>
          </motion.div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array(8).fill(0).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : wishlist.length === 0 ? (
            <EmptyState icon="❤️" title="Your wishlist is empty" description="Save your favorite pizzas here" actionLabel="Browse Menu" onAction={() => navigate('/menu')} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {wishlist.map((pizza, i) => (
                <motion.div key={pizza._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <PizzaCard pizza={pizza} showWishlistBtn onWishlistChange={() => setWishlist(prev => prev.filter(p => p._id !== pizza._id))} />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  )
}
