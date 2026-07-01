import { NextResponse } from 'next/server';
import { isAuthorized } from '@/lib/adminAuth';

export async function middleware(request) {
  if (await isAuthorized(request)) {
    return NextResponse.next();
  }
  const url = request.nextUrl.clone();
  url.pathname = '/login';
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/admin/:path*'],
};
