import { useEffect, useMemo, useState } from 'react'
import { api } from '../api.js'
import { useStore } from '../context/Store.jsx'
import { formatPrice, resolveImageUrl } from '../utils.js'

const DELIVERY_CHARGE = 280

const initialBuyer = {
  buyer_name: '',
  phone: '',
  address_line: '',
  city: '',
  state: '',
  postal_code: '',
  country: '',
  payment_method: 'COD',
}

function Cart() {
  const { cart, setCart, cartCode, email, user } = useStore()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [quantityDrafts, setQuantityDrafts] = useState({})
  const [buyer, setBuyer] = useState(initialBuyer)
  const [placedOrder, setPlacedOrder] = useState(null)

  const subtotal = useMemo(
    () =>
      (cart.cartitems || []).reduce(
        (sum, item) => sum + item.quantity * Number(item.product.price),
        0
      ),
    [cart.cartitems]
  )
  const deliveryCharge = subtotal > 0 ? DELIVERY_CHARGE : 0
  const grandTotal = subtotal + deliveryCharge

  useEffect(() => {
    const drafts = {}
    ;(cart.cartitems || []).forEach((item) => {
      drafts[item.id] = String(item.quantity)
    })
    setQuantityDrafts(drafts)
  }, [cart.cartitems])

  const updateQuantity = async (itemId, quantity) => {
    const safeQuantity = Math.max(1, Number(quantity) || 1)
    try {
      const data = await api.put('update_cartitem_quantity/', {
        item_id: itemId,
        quantity: safeQuantity,
      })
      const updated = data?.data || data?.['data ']
      if (!updated) return
      const nextItems = cart.cartitems.map((item) =>
        item.id === updated.id ? { ...item, quantity: updated.quantity } : item
      )
      const nextTotal = nextItems.reduce(
        (sum, item) => sum + item.quantity * Number(item.product.price),
        0
      )
      setCart({ ...cart, cartitems: nextItems, cart_total: nextTotal })
      setQuantityDrafts((prev) => ({ ...prev, [itemId]: String(safeQuantity) }))
    } catch (err) {
      setError(err.message || 'Failed to update cart')
    }
  }

  const commitQuantity = (itemId) => {
    updateQuantity(itemId, quantityDrafts[itemId])
  }

  const changeQuantityBy = (itemId, delta) => {
    const current = Math.max(1, Number(quantityDrafts[itemId]) || 1)
    const next = current + delta
    if (next < 1) return
    setQuantityDrafts((prev) => ({ ...prev, [itemId]: String(next) }))
    updateQuantity(itemId, next)
  }

  const removeItem = async (itemId) => {
    try {
      await api.del(`delete_cart_item/${itemId}/`)
      const nextItems = cart.cartitems.filter((item) => item.id !== itemId)
      const nextTotal = nextItems.reduce(
        (sum, item) => sum + item.quantity * Number(item.product.price),
        0
      )
      setCart({ ...cart, cartitems: nextItems, cart_total: nextTotal })
    } catch (err) {
      setError(err.message || 'Failed to remove item')
    }
  }

  const handleBuyerChange = (event) => {
    const { name, value } = event.target
    setBuyer((prev) => ({ ...prev, [name]: value }))
  }

  const placeOrder = async () => {
    if (!cart.cartitems?.length) {
      setError('Your cart is empty.')
      return
    }
    if (!buyer.buyer_name || !buyer.address_line || !buyer.city || !buyer.country) {
      setError('Please fill buyer name and full delivery address.')
      return
    }

    try {
      setLoading(true)
      setError('')
      setPlacedOrder(null)

      const payload = {
        cart_code: cartCode,
        email: user?.email || email,
        ...buyer,
      }

      if (buyer.payment_method === 'CARD') {
        const data = await api.post('checkout/', payload)
        const session = data?.data
        const url = session?.url
        if (url) {
          window.location.href = url
          return
        }
        throw new Error('Stripe checkout URL not returned by the backend.')
      }

      const data = await api.post('place_order/', payload)
      if (data?.order) {
        setPlacedOrder(data.order)
        setCart({ ...cart, cartitems: [], cart_total: 0 })
        setBuyer(initialBuyer)
      }
    } catch (err) {
      setError(err.message || 'Failed to place order')
    } finally {
      setLoading(false)
    }
  }

  if (!cart.cartitems?.length && !placedOrder) {
    return (
      <div className="panel">
        <h2>Your cart is empty</h2>
        <p className="muted">Add items from the home page to get started.</p>
      </div>
    )
  }

  return (
    <div className="cart-checkout-layout">
      <section className="panel">
        <h2 className="section-title">Cart items</h2>
        {error && <p className="notice">{error}</p>}
        <div className="cart-list">
          {(cart.cartitems || []).map((item) => {
            const currentDraft = quantityDrafts[item.id] ?? String(item.quantity)
            return (
            <div key={item.id} className="cart-item">
              <img src={resolveImageUrl(item.product.image)} alt={item.product.name} />
              <div>
                <h3>{item.product.name}</h3>
                <p className="muted">{formatPrice(item.product.price)}</p>
                <div className="cart-actions">
                  <button
                    type="button"
                    className="button ghost quantity-btn"
                    onClick={() => changeQuantityBy(item.id, -1)}
                    aria-label={`Decrease quantity for ${item.product.name}`}
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={currentDraft}
                    onChange={(e) =>
                      setQuantityDrafts((prev) => ({
                        ...prev,
                        [item.id]: e.target.value,
                      }))
                    }
                    onBlur={() => commitQuantity(item.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        commitQuantity(item.id)
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="button ghost quantity-btn"
                    onClick={() => changeQuantityBy(item.id, 1)}
                    aria-label={`Increase quantity for ${item.product.name}`}
                  >
                    +
                  </button>
                  <button
                    className="button secondary"
                    onClick={() => removeItem(item.id)}
                    type="button"
                  >
                    Remove
                  </button>
                </div>
              </div>
              <div className="cart-total">{formatPrice(item.quantity * Number(item.product.price))}</div>
            </div>
            )
          })}
        </div>
      </section>

      <aside className="panel checkout-panel">
        <h2 className="section-title">Checkout</h2>
        <p className="muted">Buying as {user?.email || email}</p>

        {placedOrder ? (
          <div className="notice">
            Order placed. Order ID: <strong>{placedOrder.order_id}</strong>
          </div>
        ) : null}

        <div className="checkout-form">
          <label>
            Buyer name
            <input
              type="text"
              name="buyer_name"
              value={buyer.buyer_name}
              onChange={handleBuyerChange}
              placeholder="Full name"
            />
          </label>
          <label>
            Phone
            <input
              type="text"
              name="phone"
              value={buyer.phone}
              onChange={handleBuyerChange}
              placeholder="+91 09876 54321"
              required
            />
          </label>
          <label>
            Address
            <input
              type="text"
              name="address_line"
              value={buyer.address_line}
              onChange={handleBuyerChange}
              placeholder="Street / apartment"
              required
            />  
          </label>
          <label>
            City
            <input type="text" name="city" value={buyer.city} onChange={handleBuyerChange} />
          </label>
          <label>
            State
            <input type="text" name="state" value={buyer.state} onChange={handleBuyerChange} />
          </label>
          <label>
            Postal code
            <input
              type="text"
              name="postal_code"
              value={buyer.postal_code}
              onChange={handleBuyerChange}
            />
          </label>
          <label>
            Country
            <input type="text" name="country" value={buyer.country} onChange={handleBuyerChange} />
          </label>

          <div className="payment-options">
            <label>
              <input
                type="radio"
                name="payment_method"
                value="COD"
                checked={buyer.payment_method === 'COD'}
                onChange={handleBuyerChange}
              />
              Cash on Delivery
            </label>
            <label>
              <input
                type="radio"
                name="payment_method"
                value="CARD"
                checked={buyer.payment_method === 'CARD'}
                onChange={handleBuyerChange}
              />
              Card (Stripe)
            </label>
          </div>

          <div className="bill-box">
            <div className="checkout-item">
              <span>Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="checkout-item">
              <span>Delivery charge</span>
              <span>{formatPrice(deliveryCharge)}</span>
            </div>
            <div className="cart-summary">
              <span>Total</span>
              <strong>{formatPrice(grandTotal)}</strong>
            </div>
          </div>
          <button className="button" onClick={placeOrder} type="button" disabled={loading}>
            {loading
              ? 'Processing...'
              : buyer.payment_method === 'COD'
              ? 'Place COD Order'
              : 'Continue to Card Payment'}
          </button>
        </div>
      </aside>
    </div>
  )
}

export default Cart
