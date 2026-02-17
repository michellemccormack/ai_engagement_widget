/**
 * Widget Loader Script
 * Embed: <script src="https://your-domain.com/widget.js" data-api-url="https://your-domain.com/api" async></script>
 */
(function () {
  if (window.__AI_WIDGET_LOADED__) return;
  window.__AI_WIDGET_LOADED__ = true;

  var s = document.currentScript;
  var apiUrl = (s && s.getAttribute('data-api-url')) || '';
  var base = window.location.origin;
  if (!apiUrl) apiUrl = base + '/api';

  window.__AI_WIDGET_API_URL__ = apiUrl;

  var root = document.getElementById('ai-engagement-widget-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'ai-engagement-widget-root';
    document.body.appendChild(root);
  }

  var link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = base + '/widget-bundle.css';
  document.head.appendChild(link);

  var script = document.createElement('script');
  script.src = base + '/widget-bundle.js';
  script.async = true;
  script.onerror = function () {
    console.warn('[AI Widget] Failed to load widget bundle');
  };
  document.body.appendChild(script);
})();
