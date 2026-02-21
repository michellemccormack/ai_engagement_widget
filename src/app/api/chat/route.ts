/**
 * POST question, get answer via semantic search.
 * Primary: embeddings + cosine similarity (threshold 0.60).
 * Fallback: generateFallbackResponse (GPT-4o-mini with full campaign knowledge).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCorsHeaders } from '@/lib/cors';
import { getFAQs, getConfig, updateFAQ, createLog } from '@/lib/airtable';
import { generateEmbedding, generateFallbackResponse } from '@/lib/openai';
import { findMostSimilar } from '@/lib/embeddings';
import { checkRateLimit } from '@/lib/rate-limit';
import { chatRequestSchema } from '@/lib/validation';
import { logger } from '@/lib/logger';
import type { ChatResponse } from '@/types/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SIMILARITY_THRESHOLD = 0.60;

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: getCorsHeaders(request),
  });
}

async function logAnswerServed(
  sessionId: string,
  payload: { faq_id?: string; confidence?: number; source: string },
  userAgent?: string,
  referrer?: string
) {
  try {
    await createLog({
      event_name: 'answer_served',
      session_id: sessionId,
      payload_json: JSON.stringify(payload),
      user_agent: userAgent,
      referrer,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    logger.error('Log answer_served failed', err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rateLimit = await checkRateLimit(ip);
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers: getCorsHeaders(request) });
    }

    const body = await request.json();
    const validated = chatRequestSchema.parse(body);

    const [config, faqs] = await Promise.all([getConfig(), getFAQs()]);

    const queryEmbedding = await generateEmbedding(validated.message);

    const faqsWithEmbedding = faqs
      .filter((f) => f.embedding && f.embedding.length > 0)
      .map((f) => ({ ...f, embedding: f.embedding! }));

    const match = findMostSimilar(queryEmbedding, faqsWithEmbedding, SIMILARITY_THRESHOLD);

    if (match) {
      const { faq, similarity } = match;
      updateFAQ(faq.id, { view_count: (faq.view_count ?? 0) + 1 }).catch((e) =>
        logger.error('updateFAQ failed', e)
      );

      const response: ChatResponse = {
        answer: faq.short_answer,
        category: faq.category,
        faq_id: faq.id,
        cta: {
          label: faq.cta_label || config.contact_cta_label || 'Learn More',
          url: faq.cta_url,
          action: faq.cta_url ? 'external_link' : 'lead_capture',
        },
        confidence: similarity,
        source: 'faq_match',
      };

      logAnswerServed(
        validated.session_id,
        { faq_id: faq.id, confidence: similarity, source: 'faq_match' },
        request.headers.get('user-agent') || undefined,
        request.headers.get('referrer') || undefined
      ).catch(() => {});

      return NextResponse.json(response, { headers: getCorsHeaders(request) });
    }

    // No FAQ match - use AI fallback with full campaign knowledge
    const fallbackMessage =
      config.fallback_message || "I'm not sure about that. Would you like to get involved with the campaign?";

    const answer = await generateFallbackResponse(
      validated.message,
      fallbackMessage,
      config.contact_cta_label || 'Get Involved'
    );

    const response: ChatResponse = {
      answer,
      cta: {
        label: config.contact_cta_label || 'Get Involved',
        url: config.contact_cta_url,
        action: config.contact_cta_url ? 'external_link' : 'lead_capture',
      },
      confidence: 0,
      source: 'no_match',
    };

    logAnswerServed(
      validated.session_id,
      { source: 'no_match' },
      request.headers.get('user-agent') || undefined,
      request.headers.get('referrer') || undefined
    ).catch(() => {});

    return NextResponse.json(response, { headers: getCorsHeaders(request) });
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400, headers: getCorsHeaders(request) });
    }
    logger.error('Chat endpoint error', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500, headers: getCorsHeaders(request) });
  }
}
