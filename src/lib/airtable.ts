/**
 * Airtable client wrapper.
 * Only serve records with status=LIVE.
 */

import Airtable from 'airtable';
import type { AirtableFAQ, AirtableConfig, AirtableLead, AirtableLog } from '@/types/airtable';
import { cacheUtils, CACHE_KEYS } from './redis';
import { logger } from './logger';

const baseId = process.env.AIRTABLE_BASE_ID;
const apiKey = process.env.AIRTABLE_API_KEY;

function getBase() {
  if (!baseId || !apiKey) {
    throw new Error('Airtable credentials not configured');
  }
  return new Airtable({ apiKey }).base(baseId);
}

export interface FAQRecord {
  id: string;
  question: string;
  category: string;
  short_answer: string;
  long_answer?: string;
  keywords?: string;
  cta_label?: string;
  cta_url?: string;
  status: 'LIVE' | 'DRAFT';
  priority?: number;
  embedding?: number[];
  view_count?: number;
  helpful_count?: number;
  force_synthesis?: boolean;
}

export interface ConfigRecord {
  key: string;
  value: string;
}

function parseEmbedding(value: unknown): number[] | undefined {
  if (typeof value === 'string') {
    try {
      const arr = JSON.parse(value) as unknown;
      return Array.isArray(arr) ? arr : undefined;
    } catch {
      return undefined;
    }
  }
  return Array.isArray(value) ? value : undefined;
}

export async function getFAQs(): Promise<FAQRecord[]> {
  const cached = await cacheUtils.get<FAQRecord[]>(CACHE_KEYS.faqs());
  if (cached) return cached;

  const base = getBase();
  const records: FAQRecord[] = [];

  await base('FAQ')
    .select({ filterByFormula: '{status} = "LIVE"', sort: [{ field: 'priority', direction: 'desc' }] })
    .eachPage((pageRecords, fetchNextPage) => {
      for (const r of pageRecords) {
        const f = r.fields as unknown as AirtableFAQ['fields'];
        records.push({
          id: r.id,
          question: f.question ?? '',
          category: f.category ?? '',
          short_answer: f.short_answer ?? '',
          long_answer: f.long_answer,
          keywords: f.keywords,
          cta_label: f.cta_label,
          cta_url: f.cta_url,
          status: (f.status as 'LIVE' | 'DRAFT') ?? 'DRAFT',
          priority: f.priority,
          embedding: parseEmbedding(f.embedding),
          view_count: f.view_count,
          helpful_count: f.helpful_count,
          force_synthesis: f.force_synthesis === true,
        });
      }
      fetchNextPage();
    });

  await cacheUtils.set(CACHE_KEYS.faqs(), records, cacheUtils.TTL.FAQS);
  return records;
}

export async function getConfig(): Promise<Record<string, string>> {
  const cached = await cacheUtils.get<Record<string, string>>(CACHE_KEYS.config());
  if (cached) return cached;

  const base = getBase();
  const config: Record<string, string> = {};

  await base('Config')
    .select()
    .eachPage((pageRecords, fetchNextPage) => {
      for (const r of pageRecords) {
        const f = r.fields as AirtableConfig['fields'];
        config[f.key] = f.value ?? '';
      }
      fetchNextPage();
    });

  await cacheUtils.set(CACHE_KEYS.config(), config, cacheUtils.TTL.CONFIG);
  return config;
}

export async function createLead(fields: AirtableLead['fields']): Promise<string> {
  const base = getBase();
  const record = await base('Leads').create({
    email: fields.email,
    zip: fields.zip,
    name: fields.name,
    tags: fields.tags,
    source: fields.source,
    source_category: fields.source_category,
    source_question_id: fields.source_question_id,
    session_duration_seconds: fields.session_duration_seconds,
    questions_asked_count: fields.questions_asked_count,
    created_at: fields.created_at,
  });
  return record.id;
}

export async function createLog(fields: AirtableLog['fields']): Promise<string> {
  const base = getBase();
  const record = await base('Logs').create({
    event_name: fields.event_name,
    session_id: fields.session_id,
    payload_json: fields.payload_json,
    user_agent: fields.user_agent,
    referrer: fields.referrer,
    created_at: fields.created_at,
  });
  return record.id;
}

export async function updateFAQ(id: string, fields: Partial<{ view_count: number }>): Promise<void> {
  const base = getBase();
  await base('FAQ').update(id, fields);
  await cacheUtils.del(CACHE_KEYS.faqs());
}
