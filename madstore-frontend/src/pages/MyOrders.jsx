import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
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
  const { user, email } = useStore()
  const [orders, setOrders] = useState([])
  const [expandedOrderId, setExpandedOrderId] = useState(null)
  const [deliveryFilter, setDeliveryFilter] = useState('all')
  const [otpLoadingByOrder, setOtpLoadingByOrder] = useState({})
  const [otpNoticeByOrder, setOtpNoticeByOrder] = useState({})
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

  const handleSendOtp = async (orderId) => {
    const targetEmail = (user?.email || email || '').toLowerCase()
    if (!targetEmail) return

    setOtpLoadingByOrder((prev) => ({ ...prev, [orderId]: true }))
    setOtpNoticeByOrder((prev) => ({ ...prev, [orderId]: '' }))
    try {
      const data = await api.post(`orders/${encodeURIComponent(orderId)}/send-otp/`, {
        email: targetEmail,
      })
      setOtpNoticeByOrder((prev) => ({
        ...prev,
        [orderId]: data?.message || 'OTP sent successfully.',
      }))
      setOtpRequestedByOrder((prev) => ({ ...prev, [orderId]: true }))
    } catch (err) {
      setOtpNoticeByOrder((prev) => ({
        ...prev,
        [orderId]: err.message || 'Failed to send OTP.',
      }))
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
          className={`chip ${deliveryFilter === 'delivered' ? 'active' : ''}`}
          onClick={() => setDeliveryFilter('delivered')}
        >
          Delivered
        </button>
        <button
          type="button"
          className={`chip ${deliveryFilter === 'not_delivered' ? 'active' : ''}`}
          onClick={() => setDeliveryFilter('not_delivered')}
        >
          Not Delivered
        </button>
      </div>
      {loading ? <p className="muted">Loading orders...</p> : null}
      {error ? <p className="notice">{error}</p> : null}
      {!loading && !filteredOrders.length ? (
        <p className="muted">No orders yet.</p>
      ) : null}
      <div className="orders-list">
        {filteredOrders.map((order) => {
          const isExpanded = expandedOrderId === order.order_id
          const orderedDate = formatDateTime(order.created_at)
          const estimatedDeliveryDate = getEstimatedDeliveryDate(order.created_at)
          return (
            <div key={order.order_id} className="order-card">
              <button
                type="button"
                className="order-head"
                onClick={() => setExpandedOrderId(isExpanded ? null : order.order_id)}
              >
                <div>
                  <strong>{order.order_id}</strong>
                  <p className="muted">{orderedDate}</p>
                </div>
                <div className="order-meta">
                  <span className="order-badge">{order.status}</span>
                  <span className="order-total">{formatPrice(order.amount)}</span>
                </div>
              </button>
              {isExpanded ? (
                <div className="order-detail">
                  <p>
                    <strong>Estimated delivery:</strong>{' '}
                    {estimatedDeliveryDate
                      ? estimatedDeliveryDate.toLocaleDateString()
                      : 'N/A'}
                  </p>
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
                  {String(order.delivery_status || '').toLowerCase() !== 'delivered' ? (
                    <>
                      <div className="order-otp-row">
                        <p className="muted">Need delivery OTP? Send it to your email.</p>
                        <button
                          type="button"
                          className="button secondary order-otp-button"
                          onClick={() => handleSendOtp(order.order_id)}
                          disabled={Boolean(otpLoadingByOrder[order.order_id])}
                        >
                          {otpLoadingByOrder[order.order_id]
                            ? 'Sending...'
                            : otpRequestedByOrder[order.order_id]
                              ? 'RESEND OTP'
                              : 'GET OTP'}
                        </button>
                      </div>
                      {otpNoticeByOrder[order.order_id] ? (
                        <p className="muted">{otpNoticeByOrder[order.order_id]}</p>
                      ) : null}
                    </>
                  ) : null}
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
