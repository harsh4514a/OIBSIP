import api from './axios'

export const getAllInventory = (params) => api.get('/inventory', { params })
export const getInventoryItem = (id) => api.get(`/inventory/${id}`)
export const addInventoryItem = (data) => api.post('/inventory', data)
export const updateStock = (id, data) => api.put(`/inventory/${id}/stock`, data)
export const deleteInventoryItem = (id) => api.delete(`/inventory/${id}`)
export const getLowStockItems = () => api.get('/inventory/low-stock')
export const triggerStockAlert = () => api.post('/inventory/trigger-alert')
