import api from './axios'

export const createOrder = (data) => api.post('/orders', data)
export const getUserOrders = (params) => api.get('/orders', { params })
export const getOrderById = (id) => api.get(`/orders/${id}`)
export const cancelOrder = (id) => api.post(`/orders/${id}/cancel`)
export const downloadInvoice = (id) => api.get(`/orders/${id}/invoice`, { responseType: 'arraybuffer' })
export const getAllOrdersAdmin = (params) => api.get('/orders/admin/all', { params })
export const updateOrderStatus = (id, status) => api.put(`/orders/${id}/status`, { status })
export const getOrderAnalytics = () => api.get('/orders/admin/analytics')
