import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api.js'
import { useStore } from '../context/Store.jsx'
import { formatPrice } from '../utils.js'

function MyOrders() {
  const { user, email } = useStore()
  const [orders, setOrders] = useState([])
  const [expandedOrderId, setExpandedOrderId] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadOrders = async () => {
      if (!user?.email) {
        setLoading(false)
        return
      }
      try {
        setLoading(true)
        const targetEmail = (user?.email || email || '').toLowerCase()
        const data = await api.get(`orders/?email=${encodeURIComponent(targetEmail)}`)
        setOrders(Array.isArray(data) ? data : [])
      } catch (err) {
        setError(err.message || 'Failed to load orders.')
      } finally {
        setLoading(false)
      }
    }
    loadOrders()
  }, [user?.email, email])

  if (!user) {
    return (
      <div className="panel">
        <h2>Sign in to view orders</h2>
        <p className="muted">Your order history will be shown here.</p>
        <Link to="/login" className="button">
          Login
        </Link>
      </div>
    )
  }

  return (
    <div className="panel orders-page">
      <h2 className="section-title">My Orders</h2>
      {loading ? <p className="muted">Loading orders...</p> : null}
      {error ? <p className="notice">{error}</p> : null}
      {!loading && !orders.length ? (
        <p className="muted">No orders yet.</p>
      ) : null}
      <div className="orders-list">
        {orders.map((order) => {
          const isExpanded = expandedOrderId === order.order_id
          return (
            <div key={order.order_id} className="order-card">
              <button
                type="button"
                className="order-head"
                onClick={() => setExpandedOrderId(isExpanded ? null : order.order_id)}
              >
                <div>
                  <strong>{order.order_id}</strong>
                  <p className="muted">{new Date(order.created_at).toLocaleString()}</p>
                </div>
                <div className="order-meta">
                  <span className="order-badge">{order.status}</span>
                  <span className="order-total">{formatPrice(order.amount)}</span>
                </div>
              </button>
              {isExpanded ? (
                <div className="order-detail">
                  <p>
                    <strong>Delivery:</strong> {order.delivery_status}
                  </p>
                  <p>
                    <strong>Address:</strong> {order.address_line}, {order.city}, {order.state}{' '}
                    {order.postal_code}, {order.country}
                  </p>
                  <p>
                    <strong>Payment:</strong> {order.payment_method}
                  </p>
                  <div className="order-items">
                    {order.items?.map((item) => (
                      <div key={item.id} className="order-item-row">
                        <span>{item.product?.name}</span>
                        <span>
                          {item.quantity} x {formatPrice(item.unit_price)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default MyOrders
