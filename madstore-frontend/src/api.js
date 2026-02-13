export const BASE_URL = 'http://127.0.0.1:8000/'

export const normalizeUrl = (path) => {
  if (!path) return BASE_URL
  if (path.startsWith('http')) return path
  if (path.startsWith('/')) return `${BASE_URL}${path.slice(1)}`
  return `${BASE_URL}${path}`
}

const request = async (path, options = {}) => {
  const url = normalizeUrl(path)
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  })

  const text = await response.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }

  if (!response.ok) {
    const message = data?.error || data?.detail || data || 'Request failed'
    throw new Error(message)
  }

  return data
}

export const api = {
  get: (path) => request(path, { method: 'GET' }),
  post: (path, body) =>
    request(path, { method: 'POST', body: JSON.stringify(body ?? {}) }),
  put: (path, body) =>
    request(path, { method: 'PUT', body: JSON.stringify(body ?? {}) }),
  del: (path) => request(path, { method: 'DELETE' }),
  normalizeUrl,
  BASE_URL,
}
