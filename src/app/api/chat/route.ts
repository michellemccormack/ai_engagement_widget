/**
 * POST question, get answer via semantic search.
 * Primary: embeddings + cosine similarity (threshold 0.60).
 * Fallback: generateFallbackResponse (GPT-4o-mini with full campaign knowledge).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCorsHeaders } from '@/lib/cors';
import { getFAQs, getConfig, updateFAQ, createLog } from '@/lib/airtable';
import { generateEmbedding, generateFallbackResponse, synthesizeAnswerFromFAQ } from '@/lib/openai';
import { findMostSimilar } from '@/lib/embeddings';
import { checkRateLimit } from '@/lib/rate-limit';
import { chatRequestSchema } from '@/lib/validation';
import { logger } from '@/lib/logger';
import type { ChatResponse } from '@/types/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SIMILARITY_THRESHOLD = 0.50;

const PROFANITY_LIST = [
  'fuck', 'shit', 'asshole', 'bitch', 'bastard', 'cunt', 'cock', 'dick',
  'pussy', 'fuk', 'fck', 'sh1t', 'a$$', 'b1tch',
];

function containsProfanity(text: string): boolean {
  const normalized = text.toLowerCase().replace(/[^a-z0-9]/g, '');
  return PROFANITY_LIST.some((word) => normalized.includes(word));
}

function isGibberishOrEmojiOnly(text: string): boolean {
  const emojiOnly = /^[\p{Emoji}\s]+$/u.test(text);
  if (emojiOnly) return true;

  const letters = text.replace(/[^a-zA-Z\s]/g, '').trim();
  const total = text.trim().length;
  if (total > 0 && letters.length / total < 0.2) return true;

  // Allow short inputs (1-2 words under 12 chars) to pass through to FAQ search
  const wordCount = text.trim().split(/\s+/).length;
  if (wordCount <= 2 && text.trim().length <= 12) return false;

  const words = text.split(/\s+/);
  const hasGibberishWord = words.some((word) => {
    const clean = word.replace(/[^a-zA-Z]/g, '');
    return clean.length >= 6 && !/[aeiouAEIOU]/.test(clean);
  });
  if (hasGibberishWord) return true;

  return false;
}

const HOT_BUTTON_TERMS = [
  'lgbtq', 'lgbt', 'gay', 'lesbian', 'bisexual', 'transgender', 'trans ',
  'nonbinary', 'non-binary', 'gender identity', 'sexual orientation',
  'same sex', 'same-sex', 'gay marriage', 'gay rights', 'pride month',
  'abortion', 'pro life', 'pro-life', 'pro choice', 'pro-choice',
  'roe v wade', 'roe vs wade', 'reproductive rights', 'planned parenthood',
  'gun control', 'gun rights', 'second amendment', '2nd amendment',
  'firearms', 'gun laws', 'gun policy', 'ar-15', 'assault weapon',
  'background check', 'open carry', 'concealed carry',
  'ice agent', 'ice raid', 'immigration enforcement', 'deportation',
  'deport', 'does brian like ice', 'does brian support ice',
  'brian and ice', 'brian ice', 'what does brian think about ice',
  'ice immigration', 'ice deportation', 'ice enforcement',
];

function isHotButtonTopic(text: string): boolean {
  const lower = text.toLowerCase();
  const matched = HOT_BUTTON_TERMS.find((term) => lower.includes(term));
  if (matched) console.log(`Hot button matched: "${matched}"`);
  return !!matched;
}

const CHEATING_TERMS = [
  'cheat', 'cheated', 'cheating', 'cheater', 'cheats',
  'unfaithful', 'infidelity', 'affair', 'has brian been unfaithful',
  'has brian ever cheated', 'cheated on his wife', 'cheating on wife',
];

function isCheatQuestion(text: string): boolean {
  const lower = text.toLowerCase();
  return CHEATING_TERMS.some((term) => lower.includes(term));
}

function isDomainAllowed(request: NextRequest, allowedDomains?: string[]): boolean {
  // If no domains configured, allow all (fail open during setup)
  if (!allowedDomains || allowedDomains.length === 0) return true;

  const origin = request.headers.get('origin') || '';
  const referer = request.headers.get('referer') || '';

  const getHostname = (url: string): string => {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return '';
    }
  };

  const originHost = getHostname(origin);
  const refererHost = getHostname(referer);

  // Allow localhost for development
  if (originHost === 'localhost' || refererHost === 'localhost') return true;

  const normalizedAllowed = allowedDomains.map((d) => d.replace(/^www\./, ''));

  return (
    normalizedAllowed.includes(originHost) ||
    normalizedAllowed.includes(refererHost)
  );
}

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

    if (containsProfanity(validated.message)) {
      try {
        await createLog({
          event_name: 'profanity_blocked',
          session_id: validated.session_id,
          payload_json: JSON.stringify({ source: 'profanity_filter' }),
          user_agent: request.headers.get('user-agent') || undefined,
          referrer: request.headers.get('referrer') || undefined,
          created_at: new Date().toISOString(),
        });
      } catch (err) {
        logger.error('Log profanity_blocked failed', err);
      }

      return NextResponse.json(
        {
          answer:
            "Let's keep things respectful! I'm here to answer questions about Brian's campaign. What would you like to know?",
          cta: {
            label: 'Get Involved',
            url: undefined,
            action: 'lead_capture',
          },
          confidence: 0,
          source: 'profanity_blocked',
        } satisfies ChatResponse,
        { headers: getCorsHeaders(request) }
      );
    }

    if (isGibberishOrEmojiOnly(validated.message)) {
      try {
        await createLog({
          event_name: 'gibberish_blocked',
          session_id: validated.session_id,
          payload_json: JSON.stringify({ source: 'gibberish_filter' }),
          user_agent: request.headers.get('user-agent') || undefined,
          referrer: request.headers.get('referrer') || undefined,
          created_at: new Date().toISOString(),
        });
      } catch (err) {
        logger.error('Log gibberish_blocked failed', err);
      }

      return NextResponse.json(
        {
          answer:
            "I understand a lot of things but not that! Ask me anything about my policies, background, or how to get involved and I'll be happy to answer.",
          cta: {
            label: 'Get Involved',
            url: undefined,
            action: 'lead_capture',
          },
          confidence: 0,
          source: 'gibberish_blocked',
        } satisfies ChatResponse,
        { headers: getCorsHeaders(request) }
      );
    }

    if (isHotButtonTopic(validated.message)) {
      try {
        await createLog({
          event_name: 'hot_button_blocked',
          session_id: validated.session_id,
          payload_json: JSON.stringify({ source: 'hot_button_filter' }),
          user_agent: request.headers.get('user-agent') || undefined,
          referrer: request.headers.get('referrer') || undefined,
          created_at: new Date().toISOString(),
        });
      } catch (err) {
        logger.error('Log hot_button_blocked failed', err);
      }

      return NextResponse.json(
        {
          answer:
            "That's an important topic. I'll be sharing my full position on this issue very soon on the website and in this chat. Stay tuned.",
          cta: {
            label: 'Stay Updated',
            url: undefined,
            action: 'lead_capture',
          },
          confidence: 0,
          source: 'hot_button_blocked',
        } satisfies ChatResponse,
        { headers: getCorsHeaders(request) }
      );
    }

    if (isCheatQuestion(validated.message)) {
      try {
        await createLog({
          event_name: 'cheat_question_blocked',
          session_id: validated.session_id,
          payload_json: JSON.stringify({ source: 'cheat_filter' }),
          user_agent: request.headers.get('user-agent') || undefined,
          referrer: request.headers.get('referrer') || undefined,
          created_at: new Date().toISOString(),
        });
      } catch (err) {
        logger.error('Log cheat_question_blocked failed', err);
      }

      return NextResponse.json(
        {
          answer:
            "I don't cheat. I am known for my honesty and integrity in both my home, public, and work life.",
          cta: {
            label: 'Get Involved',
            url: undefined,
            action: 'lead_capture',
          },
          confidence: 0,
          source: 'cheat_filter',
        } satisfies ChatResponse,
        { headers: getCorsHeaders(request) }
      );
    }

    const [config, faqs] = await Promise.all([getConfig(), getFAQs()]);

    let allowedDomains: string[] | undefined;
    try {
      const raw = config['allowed_domains'];
      if (raw) allowedDomains = JSON.parse(raw) as string[];
    } catch {
      // ignore invalid JSON
    }

    if (!isDomainAllowed(request, allowedDomains)) {
      logger.warn('Domain not allowed', {
        origin: request.headers.get('origin'),
        referer: request.headers.get('referer'),
      });
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403, headers: getCorsHeaders(request) }
      );
    }

    const queryEmbedding = await generateEmbedding(validated.message);

    const faqsWithEmbedding = faqs
      .filter((f) => f.embedding && f.embedding.length > 0)
      .map((f) => ({ ...f, embedding: f.embedding! }));

    const match = findMostSimilar(queryEmbedding, faqsWithEmbedding, SIMILARITY_THRESHOLD);

    // Log top similarity when falling back (for debugging)
    if (!match && faqsWithEmbedding.length > 0) {
      const top = findMostSimilar(queryEmbedding, faqsWithEmbedding, 0);
      if (top) {
        logger.info('Chat fallback: no match above threshold', {
          query: validated.message.slice(0, 80),
          topFaqQuestion: top.faq.question?.slice(0, 60),
          topSimilarity: top.similarity.toFixed(3),
          threshold: SIMILARITY_THRESHOLD,
        });
      }
    }

    if (match) {
      const { faq, similarity } = match;
      console.log(`FAQ match: "${faq.question}" | similarity: ${similarity}`);
      updateFAQ(faq.id, { view_count: (faq.view_count ?? 0) + 1 }).catch((e) =>
        logger.error('updateFAQ failed', e)
      );

      const SYNTHESIS_THRESHOLD = 0.70;
      const shouldSynthesize = faq.force_synthesis === true || similarity < SYNTHESIS_THRESHOLD;
      const answer = shouldSynthesize
        ? await synthesizeAnswerFromFAQ(
            validated.message,
            faq.short_answer,
            config.fallback_message || "I'm not sure about that."
          )
        : faq.short_answer;

      const response: ChatResponse = {
        answer,
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
