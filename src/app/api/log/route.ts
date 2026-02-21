/**
 * POST event logging to Airtable Logs table.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCorsHeaders } from '@/lib/cors';
import { createLog } from '@/lib/airtable';
import { checkRateLimit } from '@/lib/rate-limit';
import { logEventSchema } from '@/lib/validation';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: getCorsHeaders(request),
  });
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rateLimit = await checkRateLimit(ip);
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers: getCorsHeaders(request) });
    }

    const body = await request.json();
    const validated = logEventSchema.parse(body);

    const userAgent = request.headers.get('user-agent') || body.user_agent || '';
    const referrer = request.headers.get('referrer') || body.referrer || '';

    await createLog({
      event_name: validated.event_name,
      session_id: validated.session_id,
      payload_json: JSON.stringify(validated.payload),
      user_agent: userAgent,
      referrer,
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({ success: true }, { headers: getCorsHeaders(request) });
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400, headers: getCorsHeaders(request) });
    }
    logger.error('Log endpoint error', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500, headers: getCorsHeaders(request) });
  }
}
