/**
 * Clear config and FAQ cache (Redis).
 * Run after switching bases or when config/FAQs seem stale.
 * Usage: npx tsx scripts/clear-cache.ts
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { cacheUtils, CACHE_KEYS } from '../src/lib/redis';

async function main() {
  await cacheUtils.del(CACHE_KEYS.config());
  await cacheUtils.del(CACHE_KEYS.faqs());
  await cacheUtils.del(CACHE_KEYS.embeddings());
  console.log('Cleared config, FAQ, and embeddings cache.');
}

main().catch((err) => {
  console.error('Error:', err.message || err);
  process.exit(1);
});
