import { timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';

// ═══════════════════════════════════════════════════════════════════
// Authentication Middleware
// ═══════════════════════════════════════════════════════════════════

export class AuthError extends Error {
  constructor(
    public statusCode: number = 401,
    message: string = 'Unauthorized'
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * Validate API key from request headers against WAVE4_API_KEY.
 * API keys should be passed as: Authorization: Bearer <key> or X-API-Key: <key>
 *
 * Fails CLOSED: if WAVE4_API_KEY is not configured, every request is denied
 * (it used to allow everything, which left /api/admin/* open in production).
 * Only NODE_ENV=development skips the check, for local work.
 */
export function validateApiKey(request: NextRequest): boolean {
  const apiKey = process.env.WAVE4_API_KEY;
  if (!apiKey) {
    if (process.env.NODE_ENV === 'development') return true;
    console.error('WAVE4_API_KEY not configured - denying request');
    return false;
  }

  const authHeader = request.headers.get('authorization');
  const provided = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : request.headers.get('x-api-key');
  if (!provided) return false;

  const a = Buffer.from(provided);
  const b = Buffer.from(apiKey);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Validate environment variables at startup
 */
export function validateEnvironmentVariables(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!process.env.NEXT_PUBLIC_APP_URL) {
    errors.push('NEXT_PUBLIC_APP_URL is not configured');
  }

  // Email provider check
  if (process.env.EMAIL_PROVIDER) {
    const validProviders = ['resend', 'sendgrid', 'mailgun'];
    if (!validProviders.includes(process.env.EMAIL_PROVIDER)) {
      errors.push(`EMAIL_PROVIDER must be one of: ${validProviders.join(', ')}`);
    }

    if (!process.env.EMAIL_API_KEY) {
      errors.push('EMAIL_API_KEY is required when EMAIL_PROVIDER is set');
    }
  }

  // Slack webhook check
  if (process.env.SLACK_WEBHOOK_URL) {
    if (!process.env.SLACK_WEBHOOK_URL.startsWith('https://hooks.slack.com')) {
      errors.push('SLACK_WEBHOOK_URL appears to be invalid');
    }
  }

  // Database check
  if (!process.env.DATABASE_URL) {
    errors.push('DATABASE_URL is not configured');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Admin-only endpoint protection
 * Use this as middleware for /admin/* endpoints
 */
export async function requireAdminAuth(request: NextRequest): Promise<NextResponse | null> {
  const isValid = validateApiKey(request);

  if (!isValid) {
    return NextResponse.json(
      { error: 'Unauthorized: Invalid or missing API key' },
      { status: 401 }
    );
  }

  return null; // Allow request to proceed
}

/**
 * Rate limiting helper (simple in-memory)
 * For production, use Redis or similar
 */
const rateLimits = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  identifier: string,
  maxRequests: number = 100,
  windowMs: number = 60000 // 1 minute
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const limit = rateLimits.get(identifier);

  if (!limit || now > limit.resetAt) {
    // New window
    rateLimits.set(identifier, {
      count: 1,
      resetAt: now + windowMs,
    });
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetAt: now + windowMs,
    };
  }

  // Existing window
  if (limit.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: limit.resetAt,
    };
  }

  limit.count += 1;
  return {
    allowed: true,
    remaining: maxRequests - limit.count,
    resetAt: limit.resetAt,
  };
}

/**
 * Extract client identifier for rate limiting
 */
export function getClientIdentifier(request: NextRequest): string {
  // Try API key first (most specific)
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  const apiKey = request.headers.get('x-api-key');
  if (apiKey) {
    return apiKey;
  }

  // Fall back to IP address or unknown
  return request.headers.get('x-forwarded-for') || 'unknown';
}
