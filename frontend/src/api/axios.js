import axios from 'axios'

const api = axios.create({
  
  baseURL: import.meta.env.VITE_API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
})

// Attach JWT token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Handle 401 globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      const isAdminPath = window.location.pathname.startsWith('/admin')
      const targetPath = isAdminPath ? '/auth/admin/login' : '/auth/login'
      if (window.location.pathname !== targetPath) {
        window.location.href = targetPath
      }
    }
    return Promise.reject(error)
  }
)

export default api
