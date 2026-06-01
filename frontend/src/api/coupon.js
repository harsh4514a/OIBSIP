import api from './axios';

// Customer APIs
export const getEligibleCoupons = () => api.get('/coupons/eligible');
export const validateCoupon = (code) => api.post('/coupons/validate', { code });

// Admin APIs
export const getAllCouponsAdmin = () => api.get('/coupons/admin/all');
export const createCoupon = (data) => api.post('/coupons/admin/create', data);
export const updateCoupon = (id, data) => api.put(`/coupons/admin/${id}`, data);
export const deleteCoupon = (id) => api.delete(`/coupons/admin/${id}`);
export const toggleCouponStatus = (id) => api.patch(`/coupons/admin/${id}/toggle`);
export const getCouponAnalytics = () => api.get('/coupons/admin/analytics');
