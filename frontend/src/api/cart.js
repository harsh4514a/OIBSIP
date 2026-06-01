import api from './axios'

export const getCart = () => api.get('/cart')
export const addToCart = (data) => api.post('/cart/add', data)
export const updateCartItem = (itemId, quantity) => api.put('/cart/update', { itemId, quantity })
export const removeCartItem = (itemId) => api.delete(`/cart/remove/${itemId}`)
export const clearCart = () => api.delete('/cart/clear')
export const applyCoupon = (couponCode) => api.post('/cart/coupon', { couponCode })
export const removeCoupon = () => api.delete('/cart/coupon')
