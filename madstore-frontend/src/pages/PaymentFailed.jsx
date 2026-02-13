import { Link } from 'react-router-dom'

function PaymentFailed() {
  return (
    <div className="panel payment-page">
      <div className="payment-icon failed">
        <i className="bi bi-x-circle" />
      </div>
      <h2>Payment Failed</h2>
      <p className="muted">
        The payment was not completed. Please try again or choose Cash on Delivery from cart checkout.
      </p>
      <div className="payment-actions">
        <Link to="/cart" className="button">
          Back to Cart
        </Link>
        <Link to="/" className="button ghost">
          Continue Shopping
        </Link>
      </div>
    </div>
  )
}

export default PaymentFailed
