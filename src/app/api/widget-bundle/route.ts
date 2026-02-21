/**
 * Serves the widget loader script.
 * Rewrite: /widget.js -> /api/widget-bundle
 */

import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const loaderScript = `
(function () {
  var s = document.currentScript;
  var apiUrl = (s && s.getAttribute('data-api-url')) || '';
  if (!apiUrl && s && s.src) {
    apiUrl = s.src.replace(/\\/widget\\.js(\\?.*)?$/, '') + '/api';
  }
  var base = window.location.origin;
  if (!apiUrl) apiUrl = base + '/api';

  window.__AI_WIDGET_API_URL__ = apiUrl;

  var assetBase = apiUrl ? apiUrl.replace(/\\/api\\/?$/, '').replace(/\\/$/, '') : base;

  var root = document.getElementById('ai-engagement-widget-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'ai-engagement-widget-root';
    document.body.appendChild(root);
  }

  var link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = assetBase + '/widget-bundle.css?v=4';
  document.head.appendChild(link);

  var script = document.createElement('script');
  script.src = assetBase + '/widget-bundle.js?v=4';
  script.async = true;
  script.onerror = function () { console.warn('[AI Widget] Failed to load widget bundle'); };
  document.body.appendChild(script);
})();
`.trim();

export async function GET() {
  return new NextResponse(loaderScript, {
    headers: {
      'Content-Type': 'application/javascript',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
