const Razorpay = require('razorpay')

// Razorpay instance — keys come from .env
// In production, set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in your environment
let razorpayInstance = null

const getRazorpay = () => {
  if (!razorpayInstance) {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      console.warn('⚠️  Razorpay keys not set. Payment features will not work.')
      return null
    }
    razorpayInstance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    })
  }
  return razorpayInstance
}

module.exports = getRazorpay
