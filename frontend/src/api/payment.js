import api from './axios'

export const initiatePayment = (data) => api.post('/payments/initiate', data)
export const createRazorpayOrder = (data) => api.post('/payments/create-order', data)
export const verifyPayment = (data) => api.post('/payments/verify', data)
export const handlePaymentFailure = (data) => api.post('/payments/failure', data)
export const getPaymentDetails = (orderId) => api.get(`/payments/${orderId}`)
