/**
 * Main widget component - orchestrates bubble, panel, config, state.
 */

import { useState, useCallback } from 'react';
import Bubble from './components/Bubble';
import ChatPanel from './components/ChatPanel';
import { useConfig } from './hooks/useConfig';
import { useWidget } from './hooks/useWidget';
import type { Message } from './types';

export default function Widget() {
  const { config, ready, error: configError } = useConfig();
  const {
    messages,
    showLeadForm,
    leadFormCta,
    askQuestion,
    submitLead,
    openLeadForm,
    closeLeadForm,
    logEvent,
  } = useWidget();

  if (!ready) return null;

  // Map every category button to an actual FAQ question
  const handleQuickButton = useCallback(
    (category: string) => {
      const categoryQuestions: Record<string, string> = {
        // Core categories
        'About': 'Who is Brian Shortsleeve?',
        'Platform': "What is Brian's plan for Massachusetts?",
        'Get Involved': 'How can I volunteer for the campaign?',
        'Support': 'How do I donate to the campaign?',
        'Record': 'What did Brian accomplish at the MBTA?',
        'Voter Info': 'How can I register to vote?',
        voting: 'How can I register to vote?',
        'Events': 'Where can I meet Brian?',
        'Issues': "What's wrong with Maura Healey's leadership?",
        // Specific policy categories
        'Tax Policy': "What is Brian's tax policy?",
        'Business Policy': "What is Brian's position on small business and the economy?",
        'Immigration Policy': "What is Brian's stance on immigration?",
        'Education Policy': "What is Brian's education policy?",
        'Public Safety': "What is Brian's public safety and crime policy?",
        'Housing Policy': "What is Brian's housing and affordability policy?",
        'Transportation': "What is Brian's transportation and MBTA policy?",
        'Energy Policy': "What is Brian's energy policy?",
        // Legacy fallback
        'Policy': "What is Brian's tax policy?",
      };

      logEvent('button_click', { category }).catch(() => {});
      const question = categoryQuestions[category] || `Tell me about ${category}`;
      askQuestion(question, category);
    },
    [askQuestion, logEvent]
  );

  const handleCtaClick = useCallback(
    (cta?: Message['cta']) => {
      if (!cta) return;
      if (cta.action === 'lead_capture') {
        openLeadForm(cta);
      } else if (cta.action === 'external_link' && cta.url) {
        window.open(cta.url, '_blank', 'noopener,noreferrer');
        logEvent('cta_clicked', { label: cta.label, url: cta.url }).catch(() => {});
      }
    },
    [openLeadForm, logEvent]
  );

  const [isOpen, setIsOpen] = useState(false);

  const toggleOpen = useCallback(() => {
    const next = !isOpen;
    setIsOpen(next);
    if (next) {
      logEvent('widget_open').catch(() => {});
    }
  }, [isOpen, logEvent]);

  return (
    <div className="ai-widget-root">
      {isOpen && (
        <div className="ai-widget-panel-wrapper">
          <ChatPanel
            config={config}
            configError={configError}
            messages={messages}
            showLeadForm={showLeadForm}
            leadFormCta={leadFormCta}
            onAskQuestion={askQuestion}
            onQuickButtonClick={handleQuickButton}
            onCtaClick={handleCtaClick}
            onSubmitLead={submitLead}
            onCloseLeadForm={closeLeadForm}
          />
        </div>
      )}
      <Bubble
        onClick={toggleOpen}
        isOpen={isOpen}
        primaryColor={config.theme?.primary_color}
      />
    </div>
  );
}
