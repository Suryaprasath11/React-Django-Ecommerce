/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { api } from '../api.js'
import { getOrCreateCartCode } from '../utils.js'

const StoreContext = createContext(null)

export const StoreProvider = ({ children }) => {
  const [cartCode, setCartCode] = useState(getOrCreateCartCode())
  const [cart, setCart] = useState(() => {
    const raw = window?.localStorage?.getItem('madstore_cart')
    if (raw) {
      try {
        return JSON.parse(raw)
      } catch {
        // ignore malformed local cache
      }
    }
    return { cart_code: cartCode, cartitems: [], cart_total: 0 }
  })
  const [wishlist, setWishlist] = useState(() => {
    const raw = window?.localStorage?.getItem('madstore_wishlist')
    return raw ? JSON.parse(raw) : []
  })
  const [user, setUser] = useState(() => {
    const raw = window?.localStorage?.getItem('madstore_user')
    return raw ? JSON.parse(raw) : null
  })
  const [email, setEmail] = useState(() => user?.email || 'guest@madstore.local')

  useEffect(() => {
    localStorage.setItem('madstore_cart', JSON.stringify(cart))
  }, [cart])

  useEffect(() => {
    localStorage.setItem('madstore_wishlist', JSON.stringify(wishlist))
  }, [wishlist])

  useEffect(() => {
    localStorage.setItem('madstore_user', JSON.stringify(user))
  }, [user])

  useEffect(() => {
    const loadCart = async () => {
      if (!cartCode) return
      try {
        const data = await api.get(`cart/${cartCode}/`)
        if (data?.cart_code) {
          setCart(data)
        }
      } catch {
        setCart({ cart_code: cartCode, cartitems: [], cart_total: 0 })
      }
    }
    loadCart()
  }, [cartCode])

  const value = useMemo(
    () => ({
      cartCode,
      setCartCode,
      cart,
      setCart,
      wishlist,
      setWishlist,
      user,
      setUser,
      email,
      setEmail,
    }),
    [cartCode, cart, wishlist, user, email]
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export const useStore = () => {
  const context = useContext(StoreContext)
  if (!context) {
    throw new Error('useStore must be used inside StoreProvider')
  }
  return context
}
