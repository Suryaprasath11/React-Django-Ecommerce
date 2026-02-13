import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { api } from '../api.js'
import { useStore } from '../context/Store.jsx'
import Carousel from '../components/Carousel.jsx'
import CategoryFilter from '../components/CategoryFilter.jsx'
import ProductCard from '../components/ProductCard.jsx'

function Home() {
  const { cartCode, setCart, user, email, wishlist, setWishlist } = useStore()
  const location = useLocation()
  const navigate = useNavigate()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [carousel, setCarousel] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadHome = async () => {
    try {
      setLoading(true)
      const [productData, categoryData, carouselData] = await Promise.all([
        api.get('product/'),
        api.get('categories/'),
        api.get('carousel/'),
      ])
      setProducts(productData || [])
      setCategories(categoryData || [])
      setCarousel(carouselData || [])
    } catch (err) {
      setError(err.message || 'Failed to load store data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const query = params.get('q')
    if (query) {
      const searchProducts = async () => {
        try {
          setLoading(true)
          const data = await api.get(`search?query=${encodeURIComponent(query)}`)
          setProducts(data || [])
        } catch (err) {
          setError(err.message || 'Failed to search products')
        } finally {
          setLoading(false)
        }
      }
      searchProducts()
      return
    }
    loadHome()
  }, [location.search])

  useEffect(() => {
    const loadWishlist = async () => {
      if (!user) return
      try {
        const data = await api.get(`wishlist_item/?email=${encodeURIComponent(email)}`)
        if (Array.isArray(data)) {
          setWishlist(data)
        }
      } catch {
        // keep existing wishlist state if request fails
      }
    }
    loadWishlist()
  }, [user, email, setWishlist])

  const handleCategorySelect = (slug) => {
    if (!slug) {
      navigate('/')
      return
    }
    navigate(`/category_detail/${slug}`)
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
      setError(err.message || 'Failed to add to cart')
    }
  }

  const toggleWishlist = async (product) => {
    if (!user) {
      navigate('/login')
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
    <div className="home">
      <Carousel items={carousel} />
      {/* <section className="panel hero">
        <div>
          <span className="badge">New season</span>
          <h1>Shop tech, fashion, and lifestyle picks in one place.</h1>
          <p className="muted">
            Browse featured drops, filter by category, and build your cart in
            seconds.
          </p>
        </div>
        <div className="hero-stats">
          <div>
            <strong>24h</strong>
            <span>Fast delivery</span>
          </div>
          <div>
            <strong>3k+</strong>
            <span>Happy customers</span>
          </div>
          <div>
            <strong>Secure</strong>
            <span>Stripe checkout</span>
          </div>
        </div>
      </section> */}

      <section>
        <h2 className="section-title">Filter by category</h2>
        <CategoryFilter
          categories={categories}
          selected={null}
          onSelect={handleCategorySelect}
        />
      </section>

      <section className=''>
        <h2 className="section-title">Featured products</h2>
        {loading && <p className="muted">Loading products...</p>}
        {error && <p className="notice">{error}</p>}
        {!loading && !products.length && (
          <p className="muted">No products found.</p>
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

export default Home
