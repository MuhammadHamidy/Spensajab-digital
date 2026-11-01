import { NextResponse } from 'next/server';

export function middleware(request) {
  const { pathname } = request.nextUrl;

  const authToken = request.cookies.get('perpusdig_auth_token')?.value;
  const authUser = request.cookies.get('perpusdig_auth_user')?.value;
  const isAuthenticated = Boolean(authToken || authUser);

  // If user is on /login and is authenticated -> redirect to dashboard /
  if (pathname === '/login') {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  // Public paths accessible without librarian login
  const isPublicPath =
    pathname === '/' ||
    pathname === '/kiosk';

  // If user is not authenticated and trying to access protected administrative pages -> redirect to /login
  if (!isAuthenticated && !isPublicPath) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     * - static assets (.svg, .png, .jpg, .jpeg, .gif, .webp, .ico)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
