import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api.js'
import { useStore } from '../context/Store.jsx'

const initialForm = {
  first_name: '',
  last_name: '',
  email: '',
  password: '',
  confirmPassword: '',
}

function Login() {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleClientId, setGoogleClientId] = useState('')
  const [googleHint, setGoogleHint] = useState('')
  const { setUser, setEmail } = useStore()
  const navigate = useNavigate()
  const googleButtonRef = useRef(null)

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (!form.email || !form.password) {
      setError('Please enter your email and password.')
      return
    }

    if (mode === 'register' && form.password !== form.confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    const payload =
      mode === 'register'
        ? {
            first_name: form.first_name.trim(),
            last_name: form.last_name.trim(),
            email: form.email.trim(),
            password: form.password,
          }
        : { email: form.email.trim(), password: form.password }

    try {
      setLoading(true)
      const data = await api.post(
        mode === 'register' ? 'auth/register/' : 'auth/login/',
        payload
      )
      if (data?.user) {
        setUser(data.user)
        setEmail(data.user.email)
        navigate('/')
      }
    } catch (err) {
      setError(err.message || 'Unable to sign in.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleCredential = useCallback(
    async (response) => {
      const idToken = response?.credential
      if (!idToken) {
        setError('Google login did not return a token.')
        return
      }

      setError('')
      try {
        setLoading(true)
        const data = await api.post('auth/google/', { id_token: idToken })
        if (data?.user) {
          setUser(data.user)
          setEmail(data.user.email)
          navigate('/')
        }
      } catch (err) {
        setError(err.message || 'Google sign-in failed.')
      } finally {
        setLoading(false)
      }
    },
    [navigate, setEmail, setUser]
  )

  useEffect(() => {
    const loadGoogleConfig = async () => {
      const allowedOriginsEnv = import.meta.env.VITE_GOOGLE_ALLOWED_ORIGINS || ''
      const allowedOrigins = allowedOriginsEnv
        .split(',')
        .map((origin) => origin.trim().replace(/\/$/, ''))
        .filter(Boolean)
      const currentOrigin = window.location.origin.replace(/\/$/, '')
      if (allowedOrigins.length && !allowedOrigins.includes(currentOrigin)) {
        setGoogleClientId('')
        setGoogleHint('Google sign-in is disabled for this app origin.')
        return
      }
      const envClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
      if (envClientId) {
        setGoogleClientId(envClientId)
        setGoogleHint('')
        return
      }
      try {
        const data = await api.get('auth/google/config/')
        setGoogleClientId(data?.client_id || '')
        if (!data?.client_id) {
          setGoogleHint('Google sign-in is not configured for this origin.')
        } else {
          setGoogleHint('')
        }
      } catch {
        setGoogleClientId('')
        setGoogleHint('Google sign-in is not available right now.')
      }
    }
    loadGoogleConfig()
  }, [])

  useEffect(() => {
    if (!googleClientId) {
      return
    }

    if (!window.google?.accounts?.id || !googleButtonRef.current) return

    window.google.accounts.id.initialize({
      client_id: googleClientId,
      callback: handleGoogleCredential,
      auto_select: false,
      cancel_on_tap_outside: true,
    })

    googleButtonRef.current.innerHTML = ''
    window.google.accounts.id.renderButton(googleButtonRef.current, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      shape: 'pill',
      text: 'continue_with',
      width: 320,
      logo_alignment: 'left',
    })
  }, [googleClientId, handleGoogleCredential])

  return (
    <div className="auth">
      <section className="auth-card">
        <div className="auth-tabs">
          <button
            type="button"
            className={mode === 'login' ? 'active' : ''}
            onClick={() => setMode('login')}
          >
            Sign in
          </button>
          <button
            type="button"
            className={mode === 'register' ? 'active' : ''}
            onClick={() => setMode('register')}
          >
            Create account
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === 'register' ? (
            <div className="auth-name">
              <label>
                First name
                <input
                  type="text"
                  name="first_name"
                  value={form.first_name}
                  onChange={handleChange}
                  placeholder="Enter your first name"
                />
              </label>
              <label>
                Last name
                <input
                  type="text"
                  name="last_name"
                  value={form.last_name}
                  onChange={handleChange}
                  placeholder="Enter your last name"
                />
              </label>
            </div>
          ) : null}

          <label>
            Email address
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="name@example.com"
              autoComplete="email"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Enter your password"
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            />
          </label>
          {mode === 'register' ? (
            <label>
              Confirm password
              <input
                type="password"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="Re-enter your password"
                autoComplete="new-password"
              />
            </label>
          ) : null}

          {error ? <p className="auth-error">{error}</p> : null}

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading
              ? 'Working...'
              : mode === 'login'
              ? 'Sign in'
              : 'Create account'}
          </button>
        </form>

        <div className="auth-divider">
          <span>or continue with</span>
        </div>

        <div className="google-slot" ref={googleButtonRef} />
        {!googleClientId ? (
          <p className="muted" style={{ marginTop: 8 }}>
            {googleHint || 'Google sign-in is not configured for this environment.'}
          </p>
        ) : null}
      </section>
    </div>
  )
}

export default Login
