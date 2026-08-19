import { NextRequest, NextResponse } from 'next/server';

/**
 * Guard function for test endpoints (/api/institutes/test-*)
 * Verifies Authorization header against TEST_API_KEY env var
 */
export function validateTestApiKey(request: NextRequest): NextResponse | null {
  const testApiKey = process.env.TEST_API_KEY;

  if (!testApiKey) {
    console.warn('[TestAPI] TEST_API_KEY not configured, endpoint disabled');
    return NextResponse.json(
      { error: 'Test endpoint not configured' },
      { status: 503 }
    );
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json(
      { error: 'Missing Authorization header' },
      { status: 401 }
    );
  }

  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return NextResponse.json(
      { error: 'Invalid Authorization header format. Use: Bearer <token>' },
      { status: 401 }
    );
  }

  if (token !== testApiKey) {
    console.warn('[TestAPI] Invalid API key attempt');
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 403 }
    );
  }

  // Authorization OK
  return null;
}
