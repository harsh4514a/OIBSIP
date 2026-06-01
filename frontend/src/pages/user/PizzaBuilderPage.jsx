import Navbar from '../../components/layout/Navbar'
import Footer from '../../components/layout/Footer'
import PizzaBuilder from '../../components/pizza/PizzaBuilder'
import '../../components/pizza/pureVegBadge.css'
import { useNavigate } from 'react-router-dom'

export default function PizzaBuilderPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20">
        <div className="bg-gradient-to-r from-orange-500 to-red-600 py-12 px-4 text-center text-white">
          <h1 className="text-4xl font-display font-bold mb-2">🎨 Build Your Pizza</h1>
          <p className="text-white/80 text-lg mb-3">Customize every ingredient to perfection</p>
          <span className="pure-veg-trust-banner--light inline-flex">🟢 Fresh Vegetarian Ingredients Only</span>
        </div>
        <PizzaBuilder onComplete={() => navigate('/cart')} />
      </div>
      <Footer />
    </div>
  )
}

