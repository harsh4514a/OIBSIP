import api from './axios'

export const getDashboardStats = () => api.get('/admin/dashboard')
export const getRevenueChart = () => api.get('/admin/revenue-chart')
export const getOrderStatusChart = () => api.get('/admin/order-status-chart')
export const getTopPizzas = () => api.get('/admin/top-pizzas')
export const getRecentOrders = () => api.get('/admin/recent-orders')
export const getSalesAnalytics = () => api.get('/admin/analytics')
export const getAllUsers = (params) => api.get('/users', { params })
export const deleteUser = (id) => api.delete(`/users/${id}`)
