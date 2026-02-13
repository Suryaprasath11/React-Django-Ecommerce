import { useEffect, useState } from 'react'
import { resolveImageUrl } from '../utils.js'

function Carousel({ items }) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (!items?.length) return undefined
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % items.length)
    }, 4000)
    return () => clearInterval(timer)
  }, [items])

  if (!items?.length) {
    return (
      <div className="carousel empty">
        <p className="muted">No carousel images available.</p>
      </div>
    )
  }

  const active = items[index]

  return (
    <div className="carousel">
      <div className="carousel-media">
        <img
          src={resolveImageUrl(active.image)}
          alt={active.title || 'Carousel'}
        />
      </div>
      <div className="carousel-meta">
        <span className="badge">Featured</span>
        <h2>{active.title || 'Fresh picks for you'}</h2>
        <p className="muted">
          Curated drops, big savings, and new arrivals every week.
        </p>
        <div className="carousel-controls">
          {items.map((_, idx) => (
            <button
              key={idx}
              className={`dot ${idx === index ? 'active' : ''}`}
              onClick={() => setIndex(idx)}
              type="button"
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default Carousel
