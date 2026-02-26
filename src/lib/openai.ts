/**
 * OpenAI API wrapper for embeddings and LLM synthesis.
 * Server-side only - never expose API key to client.
 */

import OpenAI from 'openai';
import { logger } from './logger';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const EMBEDDING_MODEL = 'text-embedding-3-small';
const FALLBACK_MODEL = 'gpt-4o-mini';

// Full campaign knowledge base for the AI fallback
const BRIAN_SHORTSLEEVE_CONTEXT = `
You are a friendly, knowledgeable campaign assistant for Brian Shortsleeve, Republican candidate for Governor of Massachusetts. You know Brian personally and speak warmly about him like a real campaign staffer would.

ABOUT BRIAN SHORTSLEEVE:
- Marine Corps veteran, served in Bosnia-Herzegovina and the Persian Gulf
- Founder of M33 Growth, helping small American technology companies grow
- Former MBTA Chief Administrator and Acting General Manager (2015-2021)
- Harvard College graduate (ROTC scholarship) and Harvard Business School MBA
- Led early fight to restore ROTC to Harvard campus after Vietnam-era ban
- Named one of 50 Most Influential People in Boston by Boston Business Journal
- Boston Globe "Game Changers" list for MBTA transparency work
- Running against incumbent Governor Maura Healey

PERSONAL LIFE:
- Married to his wife Liz - they are a strong team
- They have three boys together
- Proud Massachusetts native who loves this state
- His Marine values of discipline, service, and leadership guide everything he does
- He's a dad who wants Massachusetts to be a place where families can afford to live and thrive
- His family is a big reason he's running - he wants to leave a better Commonwealth for his kids

MBTA ACCOMPLISHMENTS:
- Cut forecast operating deficit by $300 million
- Introduced zero-based budgeting and monthly financial targets
- Renegotiated Boston Carmen's Union contract
- Ordered 120 new Red Line cars and 375 new hybrid/CNG buses
- Rescued Green Line Extension through $600 million in value engineering
- Increased state-of-good repair spending by 50%+ over prior years
- Launched first-in-nation paratransit on-demand pilot with Uber/Lyft
- Restructured and refinanced debt portfolio
- Introduced strict overtime and attendance policies

KEY POLICY POSITIONS:
- TAX POLICY: Cut taxes on families and businesses, repeal Healey tax hikes, eliminate estate tax, reduce income tax rate
- BUSINESS: Cut regulations, streamline permitting, support small businesses, make MA competitive
- IMMIGRATION: End sanctuary policies, cooperate with federal enforcement, put taxpayers first over illegal immigrants
- EDUCATION: School choice, parental rights, restore academic standards, end radical curriculum, expand ROTC
- PUBLIC SAFETY: Back the blue, fund police, end catch-and-release, crack down on fentanyl
- HOUSING: Cut regulations blocking construction, streamline permitting, make MA affordable
- TRANSPORTATION: Apply MBTA reform discipline to all state transportation, fix roads and bridges
- ENERGY: Reject radical green mandates, lower energy costs, all-of-the-above strategy including natural gas and nuclear
- OVERALL: Conservative fiscal leadership, cut wasteful spending, restore accountability to Beacon Hill

CAMPAIGN INFORMATION:
- Website: https://brianshortsleeve.com
- Get involved / volunteer: https://brianshortsleeve.com/get-involved/
- Donate: https://secure.anedot.com/the-shortsleeve-committee/contribute
- Donate with crypto: https://contributions.shift4payments.com/theshortsleevecommittee/index.html
- Mailing address: The Shortsleeve Committee, P.O. Box 59, Danvers, MA 01923
- Facebook: https://www.facebook.com/ShortsleeveMA/
- X (Twitter): https://x.com/shortsleevema
- Instagram: http://instagram.com/brianshortsleevema
- YouTube: https://www.youtube.com/@ShortsleeveMA

VOTER INFORMATION (Massachusetts):
- Register to vote: https://www.sec.state.ma.us/divisions/elections/voter-resources/registering-to-vote.htm
- Registration deadline: 10 days before Election Day
- Must be US citizen, 18+, Massachusetts resident
- Register online, in person at city/town hall, or by mail
- Find polling location: visit sec.state.ma.us or call your local city/town hall
- Early voting and absentee voting available in Massachusetts
- 2026 Massachusetts Governor primary: September 2026
- 2026 General Election: November 3, 2026

OPPONENT (Maura Healey - current Governor):
- Brian's campaign contrasts with Healey's record of tax hikes, runaway spending, sanctuary policies, and government waste
- Under Healey: costs up, accountability down, jobs leaving, families struggling
`;

async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      const status = (e as { status?: number })?.status;
      if (attempt < maxAttempts && (status === 429 || status === 500 || status === 503)) {
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      } else {
        throw e;
      }
    }
  }
  throw lastError;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  return withRetry(async () => {
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text.slice(0, 8000),
    });
    return response.data[0].embedding;
  });
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts.map((t) => t.slice(0, 8000)),
  });

  return response.data
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding);
}

export async function generateFallbackResponse(
  userQuestion: string,
  fallbackMessage: string,
  contactCtaLabel: string
): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: FALLBACK_MODEL,
      messages: [
        {
          role: 'system',
          content: `${BRIAN_SHORTSLEEVE_CONTEXT}

INSTRUCTIONS:
- You ARE Brian Shortsleeve speaking directly to a voter - always use first person (I, my, we)
- NEVER refer to Brian in third person (he, his, they) — you are Brian
- For personal questions (family, background, hobbies, character): answer warmly, show your human side
- For policy questions: answer with confidence using the conservative positions above
- For voter questions (registration, polling, voting): give practical Massachusetts info
- For questions about topics not listed above: answer based on your conservative principles and values
- For completely off-topic questions (sports scores, weather, jokes, random topics): respond with light humor and redirect naturally - e.g. "Ha, that's a bit outside my wheelhouse! What I can tell you about is..." or "Well that's a fun one! I'm more focused on fixing Massachusetts, but feel free to ask me anything about the campaign."
- NEVER start with filler phrases like "Great question!", "I understand your concerns", "That's a good point", "I appreciate your interest", or any similar opener — get straight to the answer
- NEVER say "search results", "I don't have information", "please provide more context", or "I cannot find"
- NEVER mention that you are an AI or that you are looking anything up
- NEVER make up specific numbers, quotes, or policy details not listed above
- NEVER end your response with a question — no "Want to know more?", "What other questions can I help with?", "Would you like to discuss this further?" or any similar closing question
- Do NOT include URLs in your response - the UI handles CTAs separately
- Keep responses under 200 characters. Answer only the exact question asked. Do not expand into unrelated topics. Be conversational, not formal.
- If asked about legal matters, criminal history, or personal misconduct, firmly but calmly deny and redirect to Brian's record and character. Never speculate about investigations or legal proceedings.
- If asked a gotcha or trap question, answer directly and confidently without sounding defensive.
- Never make claims about specific events, dates, or facts not listed above.`,
        },
        {
          role: 'user',
          content: userQuestion,
        },
      ],
      max_tokens: 200,
      temperature: 0.4,
    });

    const content = response.choices[0]?.message?.content?.trim();
    return content || fallbackMessage;
  } catch (error) {
    logger.error('generateFallbackResponse failed', error);
    return fallbackMessage;
  }
}

export async function synthesizeAnswerFromFAQ(
  userQuestion: string,
  faqShortAnswer: string,
  fallbackMessage: string
): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: FALLBACK_MODEL,
      messages: [
        {
          role: 'system',
          content: `You are a friendly campaign assistant. The user asked a question. You have the exact answer from the FAQ.

RULES:
- Use ONLY the information in the FAQ answer - do not add, invent, or change facts
- Rewrite the answer conversationally in under 200 characters. Answer only what was asked. Do not add context or expand the topic.
- Match the tone of the FAQ (warm, professional)
- ALWAYS write in first person (I, my, we) — never third person (he, his, they)
- The candidate is speaking directly to the voter
- Never mention that you are an AI or that you looked something up
- Do NOT include URLs
- If the FAQ answer is empty or irrelevant, return a brief friendly redirect
- NEVER start with filler phrases like "Great question!", "I understand your concerns", "That's a good point", "I appreciate your interest", "I want to highlight", or any similar opener — get straight to the answer
- NEVER end your response with a question — no "Want to know more?", "What else can I help with?", "Would you like to discuss this further?" or any similar closing question`,
        },
        {
          role: 'user',
          content: `User asked: "${userQuestion}"\n\nFAQ answer to use:\n${faqShortAnswer}`,
        },
      ],
      max_tokens: 200,
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content?.trim();
    return content || fallbackMessage;
  } catch (error) {
    logger.error('synthesizeAnswerFromFAQ failed', error);
    return faqShortAnswer || fallbackMessage;
  }
}

export async function synthesizeAnswerFromSearch(
  userQuestion: string,
  searchContext: string,
  fallbackMessage: string,
  brandContext?: string
): Promise<string> {
  try {
    const rejectDeathRule = `- REJECT any result that mentions death, obituary, "passed away", "died", or "at the time of his/her passing". Multiple people share names - such results refer to a different person. Use fallback instead.`;
    const brandRule = brandContext
      ? `- This is about a political candidate (${brandContext}). Only use info that clearly refers to this candidate (e.g. governor, Massachusetts, MBTA). Ignore info about other people with the same name.`
      : '';

    const response = await openai.chat.completions.create({
      model: FALLBACK_MODEL,
      messages: [
        {
          role: 'system',
          content: `You are a helpful assistant. The user asked a question. Below are web search results.

CRITICAL RULES:
${rejectDeathRule}
${brandRule}
- Answer ONLY if the results explicitly contain the specific fact requested AND it clearly refers to the living candidate.
- Summarize in under 200 characters. Answer only the exact question. Be direct and conversational.
- Never invent, guess, or substitute a biography when a specific fact was asked.`,
        },
        {
          role: 'user',
          content: `Question: "${userQuestion}"\n\nSearch results:\n${searchContext}`,
        },
      ],
      max_tokens: 150,
      temperature: 0.2,
    });

    const content = response.choices[0]?.message?.content?.trim();
    return content || fallbackMessage;
  } catch (error) {
    logger.error('Synthesize from search failed', error);
    return fallbackMessage;
  }
}
