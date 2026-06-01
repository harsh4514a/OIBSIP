import { createContext, useState, useEffect, useCallback, useContext } from 'react'
import { getCart, addToCart as addToCartApi, updateCartItem, removeCartItem, clearCart as clearCartApi } from '../api/cart'
import { AuthContext } from './AuthContext'

export const CartContext = createContext(null)

export function CartProvider({ children }) {
  const { token } = useContext(AuthContext) // Use useContext directly to avoid circular hook import issues
  const [cartItems, setCartItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [couponCode, setCouponCode] = useState(null)
  const [couponDiscount, setCouponDiscount] = useState(0)
  const [couponDiscountAmount, setCouponDiscountAmount] = useState(0)

  const refreshCart = useCallback(async () => {
    if (!token) {
      setCartItems([])
      setCouponCode(null)
      setCouponDiscount(0)
      setCouponDiscountAmount(0)
      return
    }
    setLoading(true)
    try {
      const { data } = await getCart()
      setCartItems(Array.isArray(data.data?.cart?.items) ? data.data.cart.items : [])
      setCouponCode(data.data?.cart?.couponCode || null)
      setCouponDiscount(data.data?.cart?.couponDiscount || 0)
      setCouponDiscountAmount(data.data?.cart?.couponDiscountAmount || 0)
    } catch {
      setCartItems([])
      setCouponCode(null)
      setCouponDiscount(0)
      setCouponDiscountAmount(0)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { refreshCart() }, [refreshCart])

  const addToCart = async (itemData) => {
    const { data } = await addToCartApi(itemData)
    setCartItems(Array.isArray(data.data?.cart?.items) ? data.data.cart.items : [])
    setCouponCode(data.data?.cart?.couponCode || null)
    setCouponDiscount(data.data?.cart?.couponDiscount || 0)
    setCouponDiscountAmount(data.data?.cart?.couponDiscountAmount || 0)
    return data
  }

  const updateQuantity = async (itemId, quantity) => {
    if (quantity < 1) return removeFromCart(itemId)
    const { data } = await updateCartItem(itemId, quantity)
    setCartItems(Array.isArray(data.data?.cart?.items) ? data.data.cart.items : [])
    setCouponCode(data.data?.cart?.couponCode || null)
    setCouponDiscount(data.data?.cart?.couponDiscount || 0)
    setCouponDiscountAmount(data.data?.cart?.couponDiscountAmount || 0)
  }

  const removeFromCart = async (itemId) => {
    const { data } = await removeCartItem(itemId)
    setCartItems(Array.isArray(data.data?.cart?.items) ? data.data.cart.items : [])
    setCouponCode(data.data?.cart?.couponCode || null)
    setCouponDiscount(data.data?.cart?.couponDiscount || 0)
    setCouponDiscountAmount(data.data?.cart?.couponDiscountAmount || 0)
  }

  const clearCart = async () => {
    try { await clearCartApi() } catch {}
    setCartItems([])
    setCouponCode(null)
    setCouponDiscount(0)
    setCouponDiscountAmount(0)
  }

  const cart = {
    items: cartItems,
    itemCount: cartItems.reduce((s, i) => s + (i.quantity || 0), 0),
    total: cartItems.reduce((s, i) => s + ((i.price || 0) * (i.quantity || 0)), 0),
    couponCode,
    couponDiscount,
    couponDiscountAmount,
  }

  return (
    <CartContext.Provider value={{
      cart,
      cartItems,
      loading,
      addToCart,
      updateQuantity,
      removeFromCart,
      clearCart,
      refreshCart,
      // Top-level convenience
      itemCount: cart.itemCount,
      cartTotal: cart.total,
    }}>
      {children}
    </CartContext.Provider>
  )
}
