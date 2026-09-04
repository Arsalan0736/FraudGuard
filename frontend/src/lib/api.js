import axios from 'axios'

export const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
})

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('fg_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401) {
      // token expired or invalid — kick back to login
      if (!window.location.pathname.startsWith('/login')) {
        localStorage.removeItem('fg_token')
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  },
)
