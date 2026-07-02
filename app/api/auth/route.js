import { NextResponse } from 'next/server';
import { ADMIN_COOKIE, sessionToken, requestMeta } from '@/lib/adminAuth';
import { logSecurityEvent } from '@/lib/securityLog';

export async function POST(request) {
  const { ip, ua } = requestMeta(request);
  try {
    const { password } = await request.json();

    if (!password) {
      return NextResponse.json(
        { message: 'Password is required' },
        { status: 400 }
      );
    }

    const configured = process.env.ADMIN_PASSWORD;
    if (!configured || configured === 'changeme') {
      console.error('[auth] ADMIN_PASSWORD is unset or still the default — refusing all logins');
      return NextResponse.json(
        { message: 'Admin login is disabled until ADMIN_PASSWORD is configured' },
        { status: 503 }
      );
    }

    if (password === configured) {
      console.log(`[auth] successful login ip=${ip}`);
      const res = NextResponse.json(
        { message: 'Authentication successful' },
        { status: 200 }
      );
      res.cookies.set(ADMIN_COOKIE, await sessionToken(), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      });
      return res;
    }

    console.warn(`[auth] FAILED login attempt ip=${ip} ua="${ua}"`);
    await logSecurityEvent('login_failed', request);
    return NextResponse.json(
      { message: 'Incorrect Captain\'s Code' },
      { status: 401 }
    );
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const res = NextResponse.json({ message: 'Logged out' });
  res.cookies.set(ADMIN_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return res;
}
