import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api.js'
import { useStore } from '../context/Store.jsx'
import { formatPrice, resolveImageUrl } from '../utils.js'

function Wishlist() {
  const { wishlist, setWishlist, email, user, cartCode, setCart } = useStore()
  const navigate = useNavigate()
  const [error, setError] = useState('')

  useEffect(() => {
    const loadWishlist = async () => {
      if (!user) return
      try {
        const data = await api.get(`wishlist_item/?email=${encodeURIComponent(email)}`)
        if (Array.isArray(data)) {
          setWishlist(data)
        }
      } catch (err) {
        setError(
          err.message ||
            'Wishlist endpoint did not accept query params. Showing local data.'
        )
      }
    }
    loadWishlist()
  }, [email, setWishlist, user])

  const removeFromWishlist = async (productId) => {
    try {
      await api.post('add_to_wishlist/', {
        email,
        product_id: productId,
      })
      setWishlist((prev) => prev.filter((item) => item.product?.id !== productId))
    } catch (err) {
      setError(err.message || 'Failed to remove item from wishlist')
    }
  }

  const addToCart = async (product) => {
    if (!user) {
      navigate('/login')
      return
    }
    try {
      const data = await api.post('add_to_cart/', {
        cart_code: cartCode,
        product_id: product.id,
      })
      setCart(data)
    } catch (err) {
      setError(err.message || 'Failed to add item to cart')
    }
  }

  if (!user) {
    return (
      <div className="panel">
        <h2>Sign in to view your wishlist</h2>
        <p className="muted">Your saved items will appear here once you log in.</p>
      </div>
    )
  }

  if (!wishlist.length) {
    return (
      <div className="panel">
        <h2>Wishlist is empty</h2>
        <p className="muted">Save products you love for later.</p>
        {error && <p className="notice">{error}</p>}
      </div>
    )
  }

  return (
    <div className="panel">
      <h2 className="section-title">Wishlist</h2>
      {error && <p className="notice">{error}</p>}
      <div className="grid products">
        {wishlist.map((item) => (
          <div key={item.id} className="product-card">
            <img src={resolveImageUrl(item.product.image)} alt={item.product.name} />
            <div className="product-body">
              <h3>{item.product.name}</h3>
              <p className="price">{formatPrice(item.product.price)}</p>
              <div className="product-actions wishlist-actions">
                <button
                  type="button"
                  className="button"
                  onClick={() => addToCart(item.product)}
                >
                  Add to cart
                </button>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => removeFromWishlist(item.product.id)}
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Wishlist
