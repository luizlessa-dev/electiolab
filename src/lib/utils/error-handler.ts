import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

// ═══════════════════════════════════════════════════════════════════
// Error Handling
// ═══════════════════════════════════════════════════════════════════

export class APIError extends Error {
  constructor(
    public statusCode: number = 500,
    message: string = 'Internal Server Error',
    public code: string = 'INTERNAL_ERROR'
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export class ValidationError extends APIError {
  constructor(message: string, public details?: Record<string, string[]>) {
    super(400, message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends APIError {
  constructor(message: string = 'Resource not found') {
    super(404, message, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends APIError {
  constructor(message: string = 'Unauthorized') {
    super(401, message, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends APIError {
  constructor(message: string = 'Forbidden') {
    super(403, message, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

export class ConflictError extends APIError {
  constructor(message: string = 'Conflict') {
    super(409, message, 'CONFLICT');
    this.name = 'ConflictError';
  }
}

/**
 * Format Zod validation errors into a readable format
 */
export function formatZodErrors(error: ZodError): Record<string, string[]> {
  const formatted: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const path = issue.path.join('.');
    if (!formatted[path]) {
      formatted[path] = [];
    }
    formatted[path].push(issue.message);
  }

  return formatted;
}

/**
 * Generic error handler for API routes
 * Catches and formats all types of errors
 */
export function handleError(error: unknown): NextResponse {
  // Log error
  console.error('API Error:', error);

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: formatZodErrors(error),
      },
      { status: 400 }
    );
  }

  // Handle custom API errors
  if (error instanceof APIError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
      },
      { status: error.statusCode }
    );
  }

  // Handle Supabase errors
  if (error instanceof Error && error.message.includes('Supabase')) {
    console.error('Supabase error:', error.message);
    return NextResponse.json(
      {
        error: 'Database error',
        code: 'DATABASE_ERROR',
      },
      { status: 500 }
    );
  }

  // Handle generic errors
  if (error instanceof Error) {
    return NextResponse.json(
      {
        error: error.message || 'Internal server error',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }

  // Handle unknown errors
  return NextResponse.json(
    {
      error: 'Internal server error',
      code: 'UNKNOWN_ERROR',
    },
    { status: 500 }
  );
}

/**
 * Wrapper for async route handlers with error handling
 */
export function asyncHandler(
  handler: (request: Request) => Promise<NextResponse>
) {
  return async (request: Request) => {
    try {
      return await handler(request);
    } catch (error) {
      return handleError(error);
    }
  };
}

/**
 * Success response wrapper
 */
export function successResponse<T>(
  data: T,
  statusCode: number = 200,
  headers?: Record<string, string>
) {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    {
      status: statusCode,
      headers: headers ? new Headers(headers) : undefined,
    }
  );
}

/**
 * Error response wrapper
 */
export function errorResponse(
  message: string,
  statusCode: number = 500,
  details?: unknown
) {
  const body: { success: false; error: string; details?: unknown } = {
    success: false,
    error: message,
  };
  if (details !== undefined) {
    body.details = details;
  }

  return NextResponse.json(body, { status: statusCode });
}
