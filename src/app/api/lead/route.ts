/**
 * POST lead capture - save email/zip to Airtable Leads table.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCorsHeaders } from '@/lib/cors';
import { createLead, createLog } from '@/lib/airtable';
import { checkRateLimit } from '@/lib/rate-limit';
import { leadRequestSchema } from '@/lib/validation';
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
    const validated = leadRequestSchema.parse(body);

    const leadFields = {
      email: validated.email,
      zip: validated.zip || undefined,
      name: validated.name,
      tags: validated.tags,
      source: 'web' as const,
      source_category: validated.source_category,
      source_question_id: validated.source_question_id,
      created_at: new Date().toISOString(),
    };

    await createLead(leadFields);

    createLog({
      event_name: 'lead_captured',
      session_id: validated.session_id,
      payload_json: JSON.stringify({
        source_category: validated.source_category,
        source_question_id: validated.source_question_id,
      }),
      user_agent: request.headers.get('user-agent') ?? undefined,
      referrer: request.headers.get('referrer') ?? undefined,
      created_at: new Date().toISOString(),
    }).catch((e) => logger.error('Log lead_captured failed', e));

    return NextResponse.json({ success: true }, { headers: getCorsHeaders(request) });
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400, headers: getCorsHeaders(request) });
    }
    logger.error('Lead endpoint error', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500, headers: getCorsHeaders(request) });
  }
}
