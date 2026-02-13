import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useStore } from '../context/Store.jsx'
import { resetCartCode } from '../utils.js'

const navLinkClass = ({ isActive }) =>
  `nav-link ${isActive ? 'active' : ''}`
const defaultAvatar = '/default-avatar.svg'

function Navbar() {
  const { cart, wishlist, user, setUser, setEmail, setWishlist, setCart, setCartCode } = useStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const cartCount = cart?.cartitems?.reduce(
    (total, item) => total + (item.quantity || 0),
    0
  )
  const wishlistCount = wishlist?.length || 0
  const params = new URLSearchParams(location.search)
  const currentQuery = params.get('q') || ''
  const avatarSrc = user?.profile_picture_url || defaultAvatar

  const handleSearch = (event) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const query = (formData.get('q') || '').toString().trim()
    if (query) {
      navigate(`/?q=${encodeURIComponent(query)}`)
    } else {
      navigate('/')
    }
  }

  const handleLogout = () => {
    const nextCode = resetCartCode()
    setUser(null)
    setEmail('guest@madstore.local')
    setWishlist([])
    setCartCode(nextCode)
    setCart({ cart_code: nextCode, cartitems: [], cart_total: 0 })
    setIsMobileMenuOpen(false)
    navigate('/')
  }

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false)
  }

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <div className="nav-top">
          <NavLink to="/" className="brand" onClick={closeMobileMenu}>
            Madstore
          </NavLink>
          {user ? (
            <button
              type="button"
              className="nav-avatar mobile-only"
              onClick={() => {
                closeMobileMenu()
                navigate('/account')
              }}
              aria-label="Open account"
            >
              <img src={avatarSrc} alt={user.first_name || 'User'} />
            </button>
          ) : null}
          <button
            type="button"
            className="nav-toggle"
            aria-label="Toggle navigation menu"
            aria-expanded={isMobileMenuOpen}
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
        <form className="nav-search" onSubmit={handleSearch}>
          <input
            type="search"
            name="q"
            placeholder="Search products, categories..."
            defaultValue={currentQuery}
          />
          <button type="submit" className="button ghost searchButton">
            Search
          </button>
        </form>
        <nav className={`nav-links ${isMobileMenuOpen ? 'open' : ''}`}>
          <NavLink to="/" className={navLinkClass} onClick={closeMobileMenu}>
            Home
          </NavLink>
          {user ? (
            <NavLink
              to="/orders"
              className={({ isActive }) =>
                `${navLinkClass({ isActive })} desktop-only`
              }
              onClick={closeMobileMenu}
            >
              My Orders
            </NavLink>
          ) : null}
          {user ? (
            <NavLink
              to="/orders"
              className={({ isActive }) =>
                `${navLinkClass({ isActive })} mobile-nav-only`
              }
              onClick={closeMobileMenu}
            >
              My Orders
            </NavLink>
          ) : null}
          <NavLink
            to="/cart"
            className={({ isActive }) =>
              `${navLinkClass({ isActive })} mobile-nav-only`
            }
            onClick={closeMobileMenu}
          >
            <i className="bi bi-cart3 nav-link-icon" aria-hidden="true" />
            <span>Cart</span>
            {cartCount > 0 && <span className="pill">{cartCount}</span>}
          </NavLink>
          <NavLink
            to="/wishlist"
            className={({ isActive }) =>
              `${navLinkClass({ isActive })} mobile-nav-only`
            }
            onClick={closeMobileMenu}
          >
            <i className="bi bi-heart nav-link-icon" aria-hidden="true" />
            <span>Wishlist</span>
            {wishlistCount > 0 && <span className="pill">{wishlistCount}</span>}
          </NavLink>
          {user ? (
            <NavLink
              to="/account"
              className={({ isActive }) =>
                `${navLinkClass({ isActive })} mobile-nav-only`
              }
              onClick={closeMobileMenu}
            >
              Account
            </NavLink>
          ) : null}
          {user ? (
            <button
              type="button"
              className="nav-link nav-action mobile-nav-only"
              onClick={handleLogout}
            >
              Logout
            </button>
          ) : (
            <NavLink
              to="/login"
              className={({ isActive }) =>
                `${navLinkClass({ isActive })} mobile-nav-only`
              }
              onClick={closeMobileMenu}
            >
              Login
            </NavLink>
          )}
        </nav>
        <div className="nav-account">
          {user ? (
            <>
              <button
                type="button"
                className="nav-link nav-action desktop-only"
                onClick={handleLogout}
              >
                Logout
              </button>
              <button
                type="button"
                className="nav-avatar desktop-only"
                onClick={() => navigate('/account')}
                aria-label="Open account"
              >
                <img src={avatarSrc} alt={user.first_name || 'User'} />
              </button>
            </>
          ) : (
            <NavLink to="/login" className={navLinkClass} onClick={closeMobileMenu}>
              Login
            </NavLink>
          )}
        </div>
      </div>
    </header>
  )
}

export default Navbar
