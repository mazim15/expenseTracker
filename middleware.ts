import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = [
  '/',
  '/login',
  '/register',
  '/reset-password',
  '/debug-login',
  '/debug-reset',
  '/api/health'
]

const PROTECTED_PATHS = [
  '/dashboard',
  '/expenses',
  '/analytics',
  '/settings'
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const response = NextResponse.next()

  // Add security headers
  response.headers.set('X-DNS-Prefetch-Control', 'on')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'origin-when-cross-origin')
  
  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.googleapis.com https://*.google.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://*.googleapis.com https://*.google.com wss://*.firebaseio.com https://*.firebaseapp.com",
    "frame-src 'self' https://*.google.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests"
  ].join('; ')
  
  response.headers.set('Content-Security-Policy', csp)

  // Add nonce for scripts if needed
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  response.headers.set('x-nonce', nonce)

  // Temporarily disable auth checks to debug login issue
  // TODO: Re-enable after fixing login flow
  
  // Authentication check for protected routes
  // const isProtectedRoute = PROTECTED_PATHS.some(path => pathname.startsWith(path))
  // const isPublicRoute = PUBLIC_PATHS.includes(pathname) || pathname.startsWith('/api/')

  // if (isProtectedRoute) {
  //   // Check if user has authentication token (this would need to be implemented with your auth system)
  //   const authToken = request.cookies.get('auth-token')?.value
  //   
  //   if (!authToken) {
  //     const loginUrl = new URL('/login', request.url)
  //     loginUrl.searchParams.set('redirect', pathname)
  //     return NextResponse.redirect(loginUrl)
  //   }
  // }

  // Redirect authenticated users away from auth pages
  // if (pathname.startsWith('/login') || pathname.startsWith('/register')) {
  //   const authToken = request.cookies.get('auth-token')?.value
  //   
  //   if (authToken) {
  //     const redirectTo = request.nextUrl.searchParams.get('redirect') || '/dashboard'
  //     return NextResponse.redirect(new URL(redirectTo, request.url))
  //   }
  // }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}