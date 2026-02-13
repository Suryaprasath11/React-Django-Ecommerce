import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api.js'
import { useStore } from '../context/Store.jsx'
import ProductCard from '../components/ProductCard.jsx'

function CategoryDetail() {
  const { slug } = useParams()
  const { cartCode, setCart, user, email, wishlist, setWishlist } = useStore()
  const navigate = useNavigate()
  const [category, setCategory] = useState(null)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadCategory = async () => {
      try {
        setLoading(true)
        setError('')
        const data = await api.get(`category_detail/${slug}`)
        const payload = Array.isArray(data) ? data[0] : data
        setCategory(payload || null)
        setProducts(payload?.Product || [])
      } catch (err) {
        setError(err.message || 'Failed to load category')
      } finally {
        setLoading(false)
      }
    }

    if (slug) {
      loadCategory()
    }
  }, [slug])

  useEffect(() => {
    const loadWishlist = async () => {
      if (!user) return
      try {
        const data = await api.get(`wishlist_item/?email=${encodeURIComponent(email)}`)
        if (Array.isArray(data)) {
          setWishlist(data)
        }
      } catch {
        // keep local wishlist state if backend request fails
      }
    }
    loadWishlist()
  }, [user, email, setWishlist])

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
      setError(err.message || 'Failed to add to cart')
    }
  }

  const toggleWishlist = async (product) => {
    if (!user) {
      setError('Please sign in to manage your wishlist.')
      return
    }
    try {
      const data = await api.post('add_to_wishlist/', {
        email,
        product_id: product.id,
      })
      if (data?.id) {
        setWishlist((prev) => [...prev, data])
      } else {
        setWishlist((prev) => prev.filter((item) => item.product?.id !== product.id))
      }
    } catch (err) {
      setError(err.message || 'Failed to update wishlist')
    }
  }

  return (
    <div className="category-page">
      <Link to="/" className="button ghost back-button">
        <i className="bi bi-arrow-left-short"></i>
      </Link>


      <section>
        <h2 className="section-title">{category?.name || 'Category'}</h2>
        {loading && <p className="muted">Loading products...</p>}
        {error && <p className="notice">{error}</p>}
        {!loading && !products.length && (
          <p className="muted">No products found in this category.</p>
        )}
        <div className="grid products">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onAddToCart={addToCart}
              onToggleWishlist={toggleWishlist}
              isWishlisted={wishlist.some((item) => item.product?.id === product.id)}
            />
          ))}
        </div>
      </section>
    </div>
  )
}

export default CategoryDetail
