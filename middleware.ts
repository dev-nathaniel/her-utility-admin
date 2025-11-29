import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public routes that don't require authentication
  const publicRoutes = ["/login", "/signup"]
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route))

  // Check if user is authenticated (in real app, verify JWT token)
  const userToken = request.cookies.get("auth-token")

  // Redirect to login if accessing protected route without auth
  if (!isPublicRoute && pathname.startsWith("/dashboard") && !userToken) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // Redirect to dashboard if accessing login/signup while authenticated
  if (isPublicRoute && userToken) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/signup"],
}
