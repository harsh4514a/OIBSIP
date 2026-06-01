import { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, CheckCircle, RefreshCw } from 'lucide-react'
import { verifyEmail, resendOTP } from '../../api/auth'
import toast from 'react-hot-toast'

export default function EmailVerifyPage() {
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [countdown, setCountdown] = useState(60)
  const [verified, setVerified] = useState(false)
  const inputRefs = useRef([])
  const location = useLocation()
  const navigate = useNavigate()
  const email = location.state?.email || ''

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return
    const newOtp = [...otp]
    newOtp[index] = value.slice(-1)
    setOtp(newOtp)
    if (value && index < 5) inputRefs.current[index + 1]?.focus()
    if (newOtp.every(d => d !== '') && newOtp.join('').length === 6) {
      handleVerify(newOtp.join(''))
    }
  }

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').slice(0, 6).split('')
    if (pasted.every(c => /\d/.test(c))) {
      const newOtp = [...otp]
      pasted.forEach((d, i) => { if (i < 6) newOtp[i] = d })
      setOtp(newOtp)
      inputRefs.current[Math.min(pasted.length, 5)]?.focus()
    }
  }

  const handleVerify = async (code) => {
    setLoading(true)
    try {
      await verifyEmail(email, code)
      setVerified(true)
      toast.success('Email verified successfully!')
      setTimeout(() => navigate('/auth/login'), 2000)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid OTP')
      setOtp(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setResending(true)
    try {
      await resendOTP(email)
      toast.success('OTP resent!')
      setCountdown(60)
      setOtp(['', '', '', '', '', ''])
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resend')
    } finally {
      setResending(false)
    }
  }

  if (verified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }} className="text-center">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-green-500" />
          </div>
          <h2 className="text-2xl font-display font-bold text-foreground mb-2">Email Verified!</h2>
          <p className="text-muted-foreground">Redirecting to login...</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-card border border-border rounded-2xl p-8 shadow-xl text-center"
      >
        <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Mail className="w-8 h-8 text-orange-500" />
        </div>
        <h2 className="text-2xl font-display font-bold text-foreground mb-2">Verify Your Email</h2>
        <p className="text-muted-foreground mb-2">We've sent a 6-digit OTP to</p>
        <p className="font-semibold text-orange-500 mb-8">{email}</p>

        <div className="flex gap-3 justify-center mb-8" onPaste={handlePaste}>
          {otp.map((digit, i) => (
            <motion.input
              key={i}
              ref={el => inputRefs.current[i] = el}
              type="text" inputMode="numeric" maxLength={1}
              value={digit}
              onChange={e => handleChange(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              whileFocus={{ scale: 1.05 }}
              className={`w-12 h-14 text-center text-xl font-bold rounded-xl border-2 bg-background text-foreground focus:outline-none transition-all
                ${digit ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20' : 'border-border'}
                ${loading ? 'opacity-50 cursor-not-allowed' : 'focus:border-orange-500'}
              `}
              disabled={loading}
            />
          ))}
        </div>

        <motion.button
          onClick={() => handleVerify(otp.join(''))}
          disabled={loading || otp.some(d => !d)}
          whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold shadow-lg shadow-orange-500/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Verifying...</> : 'Verify OTP'}
        </motion.button>

        <div className="mt-6 text-sm text-muted-foreground">
          Didn't receive the OTP?{' '}
          {countdown > 0 ? (
            <span className="text-orange-500 font-medium">Resend in {countdown}s</span>
          ) : (
            <button onClick={handleResend} disabled={resending} className="text-orange-500 font-medium hover:text-orange-600 inline-flex items-center gap-1">
              <RefreshCw className={`w-4 h-4 ${resending ? 'animate-spin' : ''}`} />
              Resend OTP
            </button>
          )}
        </div>
      </motion.div>
    </div>
  )
}
