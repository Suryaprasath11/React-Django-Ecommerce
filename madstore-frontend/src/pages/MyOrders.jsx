import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api.js'
import { useStore } from '../context/Store.jsx'
import { formatPrice } from '../utils.js'

const DELIVERY_DAYS = 7

function formatDateTime(value) {
  if (!value) return 'N/A'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'N/A'
  return date.toLocaleString()
}

function getEstimatedDeliveryDate(orderedAt) {
  if (!orderedAt) return null
  const date = new Date(orderedAt)
  if (Number.isNaN(date.getTime())) return null
  date.setDate(date.getDate() + DELIVERY_DAYS)
  return date
}

function MyOrders() {
  const navigate = useNavigate()
  const { user, email } = useStore()
  const [orders, setOrders] = useState([])
  const [deliveryFilter, setDeliveryFilter] = useState('all')
  const [otpLoadingByOrder, setOtpLoadingByOrder] = useState({})
  const [otpRequestedByOrder, setOtpRequestedByOrder] = useState({})
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
        const normalized = Array.isArray(data) ? data : []
        setOrders(normalized)
        setOtpRequestedByOrder(
          normalized.reduce((acc, order) => {
            acc[order.order_id] = Boolean(order.otp_sent_at)
            return acc
          }, {})
        )
      } catch (err) {
        setError(err.message || 'Failed to load orders.')
      } finally {
        setLoading(false)
      }
    }
    loadOrders()
  }, [user?.email, email])

  const handleSendOtp = async (event, orderId) => {
    event.stopPropagation()
    const targetEmail = (user?.email || email || '').toLowerCase()
    if (!targetEmail) return

    setOtpLoadingByOrder((prev) => ({ ...prev, [orderId]: true }))
    try {
      await api.post(`orders/${encodeURIComponent(orderId)}/send-otp/`, {
        email: targetEmail,
      })
      setOtpRequestedByOrder((prev) => ({ ...prev, [orderId]: true }))
    } catch {
      // Intentionally silent per UI requirement.
    } finally {
      setOtpLoadingByOrder((prev) => ({ ...prev, [orderId]: false }))
    }
  }

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

  const filteredOrders = orders.filter((order) => {
    const isDelivered = String(order.delivery_status || '').toLowerCase() === 'delivered'
    if (deliveryFilter === 'delivered') return isDelivered
    if (deliveryFilter === 'not_delivered') return !isDelivered
    return true
  })

  return (
    <div className="panel orders-page">
      <h2 className="section-title">My Orders</h2>
      <div className="category-filter">
        <button
          type="button"
          className={`chip ${deliveryFilter === 'all' ? 'active' : ''}`}
          onClick={() => setDeliveryFilter('all')}
        >
          All
        </button>
        <button
          type="button"
          className={`chip ${deliveryFilter === 'not_delivered' ? 'active' : ''}`}
          onClick={() => setDeliveryFilter('not_delivered')}
        >
          Not Delivered
        </button>
        <button
          type="button"
          className={`chip ${deliveryFilter === 'delivered' ? 'active' : ''}`}
          onClick={() => setDeliveryFilter('delivered')}
        >
          Delivered
        </button>
      </div>
      {loading ? <p className="muted">Loading orders...</p> : null}
      {error ? <p className="notice">{error}</p> : null}
      {!loading && !filteredOrders.length ? <p className="muted">No orders yet.</p> : null}
      <div className="orders-list">
        {filteredOrders.map((order) => {
          const orderedDate = formatDateTime(order.created_at)
          const estimatedDeliveryDate = getEstimatedDeliveryDate(order.created_at)
          const isDelivered = String(order.delivery_status || '').toLowerCase() === 'delivered'
          return (
            <div
              key={order.order_id}
              className="order-card order-card-clickable"
              onClick={() => navigate(`/orders/${encodeURIComponent(order.order_id)}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  navigate(`/orders/${encodeURIComponent(order.order_id)}`)
                }
              }}
            >
              <div className="order-head">
                <div>
                  <strong>{order.order_id}</strong>
                  <p className="muted">{orderedDate}</p>
                </div>
                <div className="order-meta">
                  <span className="order-badge">{order.status}</span>
                  <span className="order-total">{formatPrice(order.amount)}</span>
                </div>
              </div>
              <div className="order-detail">
                <div className="my-orders-detail-row">
                  <div className="my-orders-meta-right">
                    <p>
                      <strong>Estimated delivery:</strong>{' '}
                      {estimatedDeliveryDate ? estimatedDeliveryDate.toLocaleDateString() : 'N/A'}
                    </p>
                    <p>
                      <strong>Delivery:</strong> {order.delivery_status}
                    </p>
                  </div>
                  {!isDelivered ? (
                    <div className="my-orders-otp-left">
                      <button
                        type="button"
                        className="button secondary order-otp-button"
                        onClick={(event) => handleSendOtp(event, order.order_id)}
                        disabled={Boolean(otpLoadingByOrder[order.order_id])}
                      >
                        {otpLoadingByOrder[order.order_id]
                          ? 'Sending...'
                          : otpRequestedByOrder[order.order_id]
                            ? 'RESEND OTP'
                            : 'GET OTP'}
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default MyOrders
