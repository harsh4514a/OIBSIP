import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Mail, Lock, User, Phone } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import toast from 'react-hot-toast'

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const validate = () => {
    if (!form.name || !form.email || !form.phone || !form.password) return 'All fields are required'
    if (form.password.length < 6) return 'Password must be at least 6 characters'
    if (form.password !== form.confirmPassword) return 'Passwords do not match'
    if (!/\S+@\S+\.\S+/.test(form.email)) return 'Invalid email'
    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const err = validate()
    if (err) return toast.error(err)
    setLoading(true)
    try {
      await register(form.name, form.email, form.phone, form.password)
      toast.success('Account created! Please verify your email.')
      navigate('/auth/verify-email', { state: { email: form.email } })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const fields = [
    { name: 'name', label: 'Full Name', type: 'text', placeholder: 'John Doe', Icon: User },
    { name: 'email', label: 'Email', type: 'email', placeholder: 'you@example.com', Icon: Mail },
    { name: 'phone', label: 'Phone', type: 'tel', placeholder: '+91 98765 43210', Icon: Phone },
    { name: 'password', label: 'Password', type: showPassword ? 'text' : 'password', placeholder: '••••••••', Icon: Lock },
    { name: 'confirmPassword', label: 'Confirm Password', type: showPassword ? 'text' : 'password', placeholder: '••••••••', Icon: Lock },
  ]

  return (
    <div className="min-h-screen flex bg-background">
      <motion.div
        initial={{ opacity: 0, x: -60 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}
        className="hidden lg:flex lg:w-5/12 relative bg-gradient-to-br from-orange-500 via-red-500 to-pink-600 flex-col items-center justify-center p-12 overflow-hidden"
      >
        <div className="absolute inset-0">
          {['🍕', '🧀', '🍅', '🫑', '🥩', '🫚'].map((emoji, i) => (
            <motion.div key={i} className="absolute text-5xl opacity-10"
              style={{ left: `${(i * 17) % 85}%`, top: `${(i * 19) % 80}%` }}
              animate={{ rotate: [0, 360], scale: [1, 1.2, 1] }}
              transition={{ duration: 10 + i, repeat: Infinity, ease: 'linear' }}>
              {emoji}
            </motion.div>
          ))}
        </div>
        <div className="relative z-10 text-white text-center">
          <div className="text-7xl mb-4">🍕</div>
          <h1 className="text-3xl font-display font-bold mb-3">Join PizzaHub</h1>
          <p className="text-white/80 mb-8">Your favorite pizzas, delivered fresh</p>
          <div className="space-y-3 text-sm text-white/90">
            {['✓ Exclusive member discounts', '✓ Track orders in real-time', '✓ Custom pizza builder', '✓ Save your favorite orders'].map(item => (
              <div key={item} className="bg-white/10 rounded-lg px-4 py-2">{item}</div>
            ))}
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}
        className="w-full lg:w-7/12 flex items-center justify-center p-8 overflow-y-auto"
      >
        <div className="w-full max-w-md py-8">
          <div className="flex items-center gap-2 mb-6 lg:hidden">
            <span className="text-3xl">🍕</span>
            <span className="text-2xl font-display font-bold text-orange-500">PizzaHub</span>
          </div>
          <h2 className="text-3xl font-display font-bold mb-2">Create Account</h2>
          <p className="text-muted-foreground mb-6">Start ordering your favorite pizzas today</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {fields.map(({ name, label, type, placeholder, Icon }) => (
              <div key={name}>
                <label className="text-sm font-medium text-foreground mb-1.5 block">{label}</label>
                <div className="relative">
                  <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                  <input
                    type={type} name={name} value={form[name]} onChange={handleChange} placeholder={placeholder}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                  />
                  {(name === 'password' || name === 'confirmPassword') && (
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </div>
            ))}

            <motion.button
              type="submit" disabled={loading}
              whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold shadow-lg shadow-orange-500/30 transition-all disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Creating account...</> : 'Create Account'}
            </motion.button>
          </form>

          <p className="text-center mt-6 text-muted-foreground text-sm">
            Already have an account?{' '}
            <Link to="/auth/login" className="text-orange-500 hover:text-orange-600 font-medium">Sign in</Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
