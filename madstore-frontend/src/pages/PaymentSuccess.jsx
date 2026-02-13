import { useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useStore } from '../context/Store.jsx'
import { resetCartCode } from '../utils.js'
import { api } from '../api.js'

function PaymentSuccess() {
  const { setCart, setCartCode } = useStore()
  const [params] = useSearchParams()

  useEffect(() => {
    const nextCode = resetCartCode()
    setCart({ cart_code: nextCode, cartitems: [], cart_total: 0 })
    setCartCode(nextCode)
  }, [setCart, setCartCode])

  useEffect(() => {
    const sessionId = params.get('session_id')
    if (!sessionId) return
    api.post('checkout/finalize/', { session_id: sessionId }).catch(() => {
      // fallback: webhook might still finalize
    })
  }, [params])

  return (
    <div className="panel payment-page">
      <div className="payment-icon success">
        <i className="bi bi-check2-circle" />
      </div>
      <h2>Payment Successful</h2>
      <p className="muted">
        Your card payment was completed successfully. Your order will appear in My Orders shortly.
      </p>
      <div className="payment-actions">
        <Link to="/orders" className="button">
          Go to My Orders
        </Link>
        <Link to="/" className="button ghost">
          Continue Shopping
        </Link>
      </div>
    </div>
  )
}

export default PaymentSuccess
