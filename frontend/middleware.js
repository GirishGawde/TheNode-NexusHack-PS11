import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'

export async function middleware(req) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  const { data: { session } } = await supabase.auth.getSession()
  
  const protectedRoutes = ['/dashboard', '/event', '/organiser']
  const isProtected = protectedRoutes.some(
    r => req.nextUrl.pathname.startsWith(r)
  )
  
  if (isProtected && !session) {
    return NextResponse.redirect(new URL('/', req.url))
  }
  return res
}

export const config = {
  matcher: ['/dashboard/:path*', '/event/:path*', '/organiser/:path*'],
}
