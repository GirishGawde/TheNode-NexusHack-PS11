import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const supabase = createRouteHandlerClient({ cookies })
    await supabase.auth.exchangeCodeForSession(code)
    
    // We can fetch the user profile here and redirect to the correct dashboard based on role
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()
        
      if (profile) {
        if (profile.role === 'organiser') {
          return NextResponse.redirect(new URL('/dashboard/organiser', request.url))
        } else {
          return NextResponse.redirect(new URL('/dashboard/participant', request.url))
        }
      }
    }
  }

  // If there's an issue or no code, redirect to home
  return NextResponse.redirect(new URL('/', request.url))
}
