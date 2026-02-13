import { useNavigate } from 'react-router-dom'
import { formatPrice, resolveImageUrl } from '../utils.js'


function ProductCard({ product, onAddToCart, onToggleWishlist, isWishlisted = false }) {
  const navigate = useNavigate()
  const imageUrl = product.display_image || product.image
  const openDetails = () => navigate(`/product/${product.slug}`)

  return (
    <article
      className="product-card clickable-card"
      onClick={openDetails}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          openDetails()
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`View details for ${product.name}`}
    >
      <button
        type="button"
        className={`wishlist-heart ${isWishlisted ? 'active' : ''}`}
        onClick={(event) => {
          event.stopPropagation()
          onToggleWishlist?.(product)
        }}
        aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
      >
        <i className={`bi ${isWishlisted ? 'bi-heart-fill' : 'bi-heart'}`} />
      </button>
      <div className="product-image">
        <img src={resolveImageUrl(imageUrl)} alt={product.name} />
      </div>
      <div className="product-body">
        <h3>{product.name}</h3>
        <p className="price">{formatPrice(product.price)}</p>
        <button
          className="button blackButton"
          onClick={(event) => {
            event.stopPropagation()
            onAddToCart(product)
          }}
          type="button"
        >
          Add to cart
        </button>
      </div>
    </article>
  )
}

export default ProductCard
