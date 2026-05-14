import axios from 'axios'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BACKEND_URL
})

api.interceptors.request.use(async (config) => {
  const { createClientComponentClient } = await import('@supabase/auth-helpers-nextjs')
  const supabase = createClientComponentClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (session) {
    config.headers.Authorization = `Bearer ${session.access_token}`
  }
  
  return config
})

export default api
