import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
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

function OrderDetail() {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const { user, email } = useStore()

  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [otpLoading, setOtpLoading] = useState(false)
  const [otpRequested, setOtpRequested] = useState(false)

  useEffect(() => {
    const loadOrder = async () => {
      if (!orderId) {
        setError('Order id is missing.')
        setLoading(false)
        return
      }
      try {
        setLoading(true)
        const data = await api.get(`orders/track/${encodeURIComponent(orderId)}/`)
        setOrder(data || null)
        setOtpRequested(Boolean(data?.otp_sent_at))
      } catch (err) {
        setError(err.message || 'Failed to load order details.')
      } finally {
        setLoading(false)
      }
    }
    loadOrder()
  }, [orderId])

  const handleSendOtp = async () => {
    if (!orderId) return
    const targetEmail = (user?.email || email || '').toLowerCase()
    if (!targetEmail) return

    setOtpLoading(true)
    try {
      await api.post(`orders/${encodeURIComponent(orderId)}/send-otp/`, {
        email: targetEmail,
      })
      setOtpRequested(true)
    } catch {
      // Intentionally silent per UI requirement.
    } finally {
      setOtpLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="panel">
        <h2>Sign in to view order details</h2>
        <p className="muted">Please login first.</p>
        <Link to="/login" className="button">
          Login
        </Link>
      </div>
    )
  }

  const estimatedDeliveryDate = getEstimatedDeliveryDate(order?.created_at)
  const isDelivered = String(order?.delivery_status || '').toLowerCase() === 'delivered'

  return (
    <div className="panel orders-page order-detail-page">
      <button type="button" className="button ghost back-button" onClick={() => navigate('/orders')}>
        Back
      </button>

      {loading ? <p className="muted">Loading order details...</p> : null}
      {error ? <p className="notice">{error}</p> : null}

      {!loading && order ? (
        <div className="order-detail-content">
          <h2 className="section-title">Order Details</h2>
          <div className="order-detail-layout">
            <div className="order-detail-left">
              <div className="order-card">
                <div className="order-detail">
                  <p>
                    <strong>Order ID:</strong> {order.order_id}
                  </p>
                  <p>
                    <strong>Ordered at:</strong> {formatDateTime(order.created_at)}
                  </p>
                  <p>
                    <strong>Total:</strong> {formatPrice(order.amount)}
                  </p>
                  <p>
                    <strong>Status:</strong> {order.status}
                  </p>
                  <p>
                    <strong>Delivery status:</strong> {order.delivery_status}
                  </p>
                  <p>
                    <strong>Estimated delivery:</strong>{' '}
                    {estimatedDeliveryDate ? estimatedDeliveryDate.toLocaleDateString() : 'N/A'}
                  </p>
                  <p>
                    <strong>Payment method:</strong> {order.payment_method}
                  </p>
                  <p>
                    <strong>Address:</strong> {order.address_line}, {order.city}, {order.state}{' '}
                    {order.postal_code}, {order.country}
                  </p>
                </div>
              </div>

              {!isDelivered ? (
                <div className="order-detail-otp">
                    <button
                    type="button"
                    className="button secondary order-otp-button"
                    onClick={handleSendOtp}
                    disabled={otpLoading} 
                  >
                    {otpLoading ? 'Sending...' : otpRequested ? 'RESEND OTP' : 'GET OTP'}
                  </button>
                </div>
              ) : null}
            </div>

            <div className="order-detail-right">
              <h3>Items</h3>
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
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default OrderDetail
