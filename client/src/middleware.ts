// client/src/middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Get token from cookies or local storage
  const token = request.cookies.get('token')?.value || ''
  
  // Define protected paths
  const protectedPaths = [
    '/profile',
    '/profile/edit',
    '/profile/credentials',
    '/articles/new',
    '/articles/edit',
    '/articles/review',
    '/dashboard'
  ]

  // Check if the current path is protected
  const isProtectedPath = protectedPaths.some(path => 
    request.nextUrl.pathname.startsWith(path)
  )

  if (isProtectedPath && !token) {
    // Redirect to login page with return URL
    const returnUrl = encodeURIComponent(request.nextUrl.pathname)
    return NextResponse.redirect(
      new URL(`/login?returnUrl=${returnUrl}`, request.url)
    )
  }

  return NextResponse.next()
}

// Configure paths that need middleware
export const config = {
  matcher: [
    '/profile/:path*',
    '/articles/:path*',
    '/dashboard/:path*'
  ]
}