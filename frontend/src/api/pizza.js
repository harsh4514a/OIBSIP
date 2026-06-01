import api from './axios'

export const getAllPizzas = (params) => api.get('/pizzas', { params })
export const getFeaturedPizzas = () => api.get('/pizzas/featured')
export const getPizzaById = (id) => api.get(`/pizzas/${id}`)
export const createPizza = (data) => api.post('/pizzas', data)
export const updatePizza = (id, data) => api.put(`/pizzas/${id}`, data)
export const deletePizza = (id) => api.delete(`/pizzas/${id}`)
export const toggleAvailability = (id) => api.patch(`/pizzas/${id}/toggle`)
export const searchPizzas = (q) => api.get('/pizzas/search', { params: { q } })
