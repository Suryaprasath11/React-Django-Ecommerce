import { BASE_URL } from './api.js'

export const formatPrice = (value) => {
  const amount = Number(value || 0)
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'INR',
  }).format(amount)
}

export const resolveImageUrl = (url, baseUrl = BASE_URL) => {
  if (!url) return ''
  if (url.startsWith('http')) return url
  if (url.startsWith('/')) return `${baseUrl}${url.slice(1)}`
  return `${baseUrl}${url}`
}

export const getOrCreateCartCode = () => {
  if (typeof window === 'undefined') return 'local'
  const key = 'madstore_cart_code'
  const existing = window.localStorage.getItem(key)
  if (existing) return existing
  const next = createCartCode()
  window.localStorage.setItem(key, next)
  return next
}

export const resetCartCode = () => {
  if (typeof window === 'undefined') return 'local'
  const key = 'madstore_cart_code'
  const next = createCartCode()
  window.localStorage.setItem(key, next)
  return next
}

const createCartCode = () => {
  const next = `cart_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`
  return next
}
