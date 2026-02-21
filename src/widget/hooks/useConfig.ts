/**
 * Config loading + caching.
 * Fetches from API, caches in localStorage (10 min TTL).
 * Bubble is always clickable - uses fallback immediately if fetch fails or times out.
 */

import { useState, useEffect, useCallback } from 'react';
import type { WidgetConfig } from '../types';

const CONFIG_CACHE_KEY = 'ai_widget_config';
const CACHE_TTL_MS = 10 * 60 * 1000;
const FETCH_TIMEOUT_MS = 8000;

const FALLBACK_CONFIG: WidgetConfig = {
  brand_name: 'Support',
  welcome_message: 'Hi! How can I help you today?',
  quick_buttons: [],
  fallback_message: "I'm not sure about that. Would you like to speak with someone?",
  contact_cta_label: 'Contact Us',
  require_email_to_chat: false,
};

function getApiUrl(): string {
  if (typeof window === 'undefined') return '';
  const globalUrl = (window as { __AI_WIDGET_API_URL__?: string }).__AI_WIDGET_API_URL__;
  if (globalUrl) return globalUrl.replace(/\/$/, '');
  return window.location.origin + '/api';
}

interface CachedConfig {
  config: WidgetConfig;
  cachedAt: number;
}

function getCachedConfig(): WidgetConfig | null {
  try {
    const raw = localStorage.getItem(CONFIG_CACHE_KEY);
    if (!raw) return null;
    const { config, cachedAt }: CachedConfig = JSON.parse(raw);
    if (Date.now() - cachedAt > CACHE_TTL_MS) return null;
    return config;
  } catch {
    return null;
  }
}

function setCachedConfig(config: WidgetConfig): void {
  try {
    localStorage.setItem(
      CONFIG_CACHE_KEY,
      JSON.stringify({ config, cachedAt: Date.now() })
    );
  } catch {
    // ignore
  }
}

function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  return Promise.race([
    fetch(url),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Config request timed out')), ms)
    ),
  ]);
}

export function useConfig() {
  const [config, setConfig] = useState<WidgetConfig | null>(() => getCachedConfig());
  const [ready, setReady] = useState<boolean>(() => !!getCachedConfig());
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    const cachedNow = getCachedConfig();
    if (cachedNow) {
      console.log('[Widget] Config loaded from cache');
      setConfig(cachedNow);
      setError(null);
      setReady(true);
      return;
    }

    console.log('[Widget] Config loading started');
    setError(null);
    const apiUrl = getApiUrl();

    try {
      const res = await fetchWithTimeout(`${apiUrl}/config`, FETCH_TIMEOUT_MS);
      if (!res.ok) throw new Error(`Config API returned ${res.status}`);
      const data = await res.json();
      const widgetConfig: WidgetConfig = {
        brand_name: data.brand_name || 'Support',
        welcome_message: data.welcome_message || 'Hi! How can I help you today?',
        quick_buttons: data.quick_buttons || [],
        theme: data.theme,
        fallback_message:
          data.fallback_message || "I'm not sure about that. Would you like to speak with someone?",
        contact_cta_label: data.contact_cta_label || 'Contact Us',
        contact_cta_url: data.contact_cta_url,
        require_email_to_chat: data.require_email_to_chat === true,
      };
      setCachedConfig(widgetConfig);
      setConfig(widgetConfig);
      setReady(true);
      console.log('[Widget] Config loaded successfully');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load';
      console.error('[Widget] Config failed:', msg);
      setError(msg);
      setConfig(FALLBACK_CONFIG);
      setReady(true);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  return { config: config ?? FALLBACK_CONFIG, ready, error, refetch: fetchConfig };
}
