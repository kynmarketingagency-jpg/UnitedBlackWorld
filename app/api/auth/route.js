import { NextResponse } from 'next/server';

// Simple password authentication
// In production, use proper authentication with Supabase Auth
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'changeme';

export async function POST(request) {
  try {
    const { password } = await request.json();

    if (!password) {
      return NextResponse.json(
        { message: 'Password is required' },
        { status: 400 }
      );
    }

    if (password === ADMIN_PASSWORD) {
      return NextResponse.json(
        { message: 'Authentication successful' },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        { message: 'Incorrect Captain\'s Code' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
