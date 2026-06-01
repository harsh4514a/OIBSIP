import { createContext, useState, useEffect, useCallback } from 'react'
import { login as loginApi, adminLogin as adminLoginApi, register as registerApi, getMe } from '../api/auth'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(() => localStorage.getItem('token'))
  const [loading, setLoading] = useState(true)

  const fetchMe = useCallback(async () => {
    if (!token) {
      setLoading(false)
      return
    }
    try {
      const { data } = await getMe()
      // Backend returns: { success, data: { user } }
      setUser(data.data?.user || null)
    } catch (err) {
      console.error('fetchMe error:', err)
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem('token')
        setToken(null)
        setUser(null)
      }
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { fetchMe() }, [fetchMe])

  const login = async (email, password) => {
    const { data } = await loginApi(email, password)
    // Backend returns: { success, data: { token, user } }
    const t = data.data?.token
    const u = data.data?.user
    if (!t) throw new Error('No token received from server')
    localStorage.setItem('token', t)
    setToken(t)
    setUser(u)
    return data
  }

  const adminLogin = async (email, password) => {
    const { data } = await adminLoginApi(email, password)
    const t = data.data?.token
    const u = data.data?.user
    if (!t) throw new Error('No token received from server')
    localStorage.setItem('token', t)
    setToken(t)
    setUser(u)
    return data
  }

  const register = async (name, email, phone, password) => {
    const { data } = await registerApi(name, email, phone, password)
    return data
  }

  const logout = () => {
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{
      user,
      setUser,
      token,
      loading,
      login,
      adminLogin,
      register,
      logout,
      isAuthenticated: !!user,
      isAdmin: user?.role === 'admin',
    }}>
      {children}
    </AuthContext.Provider>
  )
}
