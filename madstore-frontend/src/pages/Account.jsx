import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../context/Store.jsx'

const defaultAvatar = '/default-avatar.svg'

function Account() {
  const { user, setUser, setEmail } = useStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    setUser(null)
    setEmail('guest@madstore.local')
    navigate('/')
  }

  useEffect(() => {
    if (!user) {
      navigate('/login')
    }
  }, [user, navigate])

  if (!user) return null

  return (
    <div className="panel account account-centered">
      <div className="account-header">
        <div className="avatar">
          <img
            src={user.profile_picture_url || defaultAvatar}
            alt={user.first_name || 'User'}
          />
        </div>
        <div>
          <h2>
            {user.first_name || user.last_name
              ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
              : 'Madstore Member'}
          </h2>
          <p className="muted">{user.email}</p>
        </div>
      </div>

      <div className="account-actions">
        <button type="button" className="button ghost" onClick={handleLogout}>
          Log out
        </button>
      </div>
    </div>
  )
}

export default Account
