import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api.js'
import { formatPrice, resolveImageUrl } from '../utils.js'
import { useStore } from '../context/Store.jsx'

const renderStars = (rating = 0) => (
  <span className="star-row" aria-label={`${rating} out of 5 stars`}>
    {Array.from({ length: 5 }).map((_, index) => (
      <i
        key={`star-${index}`}
        className={`bi ${index < Number(rating) ? 'bi-star-fill' : 'bi-star'}`}
        aria-hidden="true"
      />
    ))}
  </span>
)

function ProductDetail() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { cartCode, setCart, wishlist, setWishlist, email, user } = useStore()
  const [product, setProduct] = useState(null)
  const [reviews, setReviews] = useState([])
  const [rating, setRating] = useState('5')
  const [reviewText, setReviewText] = useState('')
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadProduct = async () => {
      try {
        setLoading(true)
        const data = await api.get(`product_details/${slug}`)
        const payload = Array.isArray(data) ? data[0] : data
        setProduct(payload)
      } catch (err) {
        setError(err.message || 'Failed to load product')
      } finally {
        setLoading(false)
      }
    }
    loadProduct()
  }, [slug])

  useEffect(() => {
    const loadReviews = async () => {
      if (!product?.id) return
      try {
        const data = await api.get(`reviews/${product.id}/`)
        setReviews(data || [])
      } catch (err) {
        setError(err.message || 'Failed to load reviews')
      }
    }
    loadReviews()
  }, [product?.id])

  const productImages = useMemo(() => {
    const images = product?.all_images || []
    if (images.length) return images
    return [product?.display_image || product?.image].filter(Boolean)
  }, [product])

  useEffect(() => {
    setCurrentImageIndex(0)
  }, [product?.id])

  const showPrevImage = () => {
    if (!productImages.length) return
    setCurrentImageIndex((prev) => (prev - 1 + productImages.length) % productImages.length)
  }

  const showNextImage = () => {
    if (!productImages.length) return
    setCurrentImageIndex((prev) => (prev + 1) % productImages.length)
  }

  const addToCart = async () => {
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

  const toggleWishlist = async () => {
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
        setWishlist([...wishlist, data])
      } else {
        setWishlist(wishlist.filter((item) => item.product?.id !== product.id))
      }
    } catch (err) {
      setError(err.message || 'Failed to update wishlist')
    }
  }

  const submitReview = async (event) => {
    event.preventDefault()
    if (!user) {
      setError('Please sign in to submit a review.')
      return
    }
    if (!reviewText.trim()) return
    try {
      const data = await api.post('add_review/', {
        product_id: product.id,
        email,
        rating,
        review: reviewText,
      })
      setReviews([data, ...reviews])
      setReviewText('')
      setRating('5')
    } catch (err) {
      setError(err.message || 'Failed to submit review')
    }
  }

  if (loading) return <p className="muted">Loading product...</p>
  if (error) return <p className="notice">{error}</p>
  if (!product) return <p className="muted">Product not found.</p>

  const isWishlisted = wishlist.some((item) => item.product?.id === product.id)
  const activeImage = productImages[currentImageIndex] || product.display_image || product.image

  return (
    <div className="panel detail detail-reworked">
      <div className="detail-left">
        <div className="detail-media gallery-media">
          <img src={resolveImageUrl(activeImage)} alt={product.name} />
          {productImages.length > 1 ? (
            <>
              <button
                type="button"
                className="media-nav prev"
                onClick={showPrevImage}
                aria-label="Show previous image"
              >
                <i className="bi bi-chevron-left" />
              </button>
              <button
                type="button"
                className="media-nav next"
                onClick={showNextImage}
                aria-label="Show next image"
              >
                <i className="bi bi-chevron-right" />
              </button>
            </>
          ) : null}
        </div>
        {productImages.length > 1 ? (
          <div className="media-dots">
            {productImages.map((_, index) => (
              <button
                key={`img-dot-${index}`}
                type="button"
                className={`dot ${index === currentImageIndex ? 'active' : ''}`}
                onClick={() => setCurrentImageIndex(index)}
                aria-label={`View image ${index + 1}`}
              />
            ))}
          </div>
        ) : null}
        <section className="reviews reviews-under-media">
          <h3>Reviews</h3>
          {!reviews.length && (
            <p className="muted">No reviews yet. Be the first to review.</p>
          )}
          <div className="review-list">
            {reviews.map((item) => (
              <div key={item.id} className="review">
                <div className="review-meta">
                  <strong>{item.user?.first_name || 'Customer'}</strong>
                  {renderStars(item.rating || 0)}
                </div>
                <p>{item.review}</p>
              </div>
            ))}
          </div>
          <form className="review-form" onSubmit={submitReview}>
            <div className="review-fields">
              <label>
                Rating
                <select
                  value={rating}
                  onChange={(event) => setRating(event.target.value)}
                >
                  {[5, 4, 3, 2, 1].map((value) => (
                    <option key={value} value={value}>
                      {value} Star{value > 1 ? 's' : ''}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Your review
                <textarea
                  value={reviewText}
                  onChange={(event) => setReviewText(event.target.value)}
                  rows="3"
                  placeholder="Share your product experience"
                />
              </label>
            </div>
            <button className="button submitButton" type="submit">
              Submit review
            </button>
          </form>
        </section>
      </div>

      <div className="detail-content detail-right">
        <h2>{product.name}</h2>
        <p className="price">{formatPrice(product.price)}</p>
        <p className="muted">{product.description}</p>
        <div className="detail-actions">
          <button className="button blackButton" onClick={addToCart} type="button">
            Add to cart
          </button>
          <button className="button ghost whiteButton" onClick={toggleWishlist} type="button">
            {isWishlisted ? 'Remove wishlist' : 'Add to wishlist'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ProductDetail
