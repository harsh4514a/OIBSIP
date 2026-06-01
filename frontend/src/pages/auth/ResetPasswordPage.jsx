import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Lock, Eye, EyeOff } from 'lucide-react'
import { resetPassword } from '../../api/auth'
import toast from 'react-hot-toast'

export default function ResetPasswordPage() {
  const [form, setForm] = useState({ password: '', confirmPassword: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = params.get('token') || ''

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.password || !form.confirmPassword) return toast.error('All fields required')
    if (form.password.length < 6) return toast.error('Password too short')
    if (form.password !== form.confirmPassword) return toast.error('Passwords do not match')
    setLoading(true)
    try {
      await resetPassword(token, form.password)
      toast.success('Password reset successfully!')
      navigate('/auth/login')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reset failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-card border border-border rounded-2xl p-8 shadow-xl"
      >
        <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Lock className="w-8 h-8 text-orange-500" />
        </div>
        <h2 className="text-2xl font-display font-bold text-foreground text-center mb-2">Reset Password</h2>
        <p className="text-muted-foreground text-center mb-8">Choose a new secure password</p>
        <form onSubmit={handleSubmit} className="space-y-5">
          {[{ label: 'New Password', key: 'password' }, { label: 'Confirm Password', key: 'confirmPassword' }].map(({ label, key }) => (
            <div key={key}>
              <label className="text-sm font-medium mb-1.5 block">{label}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                <input type={showPassword ? 'text' : 'password'} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} placeholder="••••••••"
                  className="w-full pl-10 pr-12 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ))}
          <motion.button type="submit" disabled={loading} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold shadow-lg shadow-orange-500/30 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
            {loading ? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Updating...</> : 'Update Password'}
          </motion.button>
        </form>
      </motion.div>
    </div>
  )
}
