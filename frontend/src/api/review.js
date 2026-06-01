import api from './axios'

export const createReview = (data) => api.post('/reviews', data)
export const getPizzaReviews = (pizzaId) => api.get(`/reviews/pizza/${pizzaId}`)
export const updateReview = (id, data) => api.put(`/reviews/${id}`, data)
export const deleteReview = (id) => api.delete(`/reviews/${id}`)
export const voteHelpful = (id) => api.post(`/reviews/${id}/helpful`)
export const getOrderReviews = (orderId) => api.get(`/reviews/order/${orderId}`)
