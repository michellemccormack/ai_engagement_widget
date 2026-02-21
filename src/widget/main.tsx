/**
 * Widget entry point.
 * Renders the widget directly into document.body (matches production site).
 * Avoids stacking-context issues when embedded on Squarespace and other hosts.
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { createPortal } from 'react-dom';
import Widget from './Widget';
import './styles.css';

const CONTAINER_ID = 'ai-engagement-widget-root';

function App() {
  return createPortal(<Widget />, document.body);
}

function init() {
  let container = document.getElementById(CONTAINER_ID);
  if (!container) {
    container = document.createElement('div');
    container.id = CONTAINER_ID;
    document.body.appendChild(container);
  }

  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
