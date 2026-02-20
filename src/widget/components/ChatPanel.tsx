import React, { useEffect, useRef } from 'react';
import type { Message } from '../types';

interface ChatPanelProps {
  config: {
    brand_name: string;
    welcome_message: string;
    quick_buttons?: Array<{ label: string; category: string }>;
    theme?: { primary_color?: string };
    fallback_message?: string;
  };
  configError?: string | null;
  messages: Message[];
  showLeadForm: boolean;
  leadFormCta?: Message['cta'];
  onAskQuestion: (message: string, category?: string) => void;
  onQuickButtonClick: (category: string) => void;
  onCtaClick: (cta?: Message['cta']) => void;
  onSubmitLead: (email: string, zip?: string, name?: string, sourceCategory?: string, sourceQuestionId?: string) => Promise<boolean>;
  onCloseLeadForm: () => void;
}

const QUICK_CATEGORIES = [
  'About', 'Platform', 'Tax Policy', 'Business Policy',
  'Immigration Policy', 'Education Policy', 'Public Safety',
  'Housing Policy', 'Transportation', 'Energy Policy',
  'Get Involved', 'Support',
];

export default function ChatPanel({
  config,
  configError,
  messages,
  showLeadForm,
  leadFormCta,
  onAskQuestion,
  onQuickButtonClick,
  onCtaClick,
  onSubmitLead,
  onCloseLeadForm,
}: ChatPanelProps) {
  const [input, setInput] = React.useState('');
  const [leadEmail, setLeadEmail] = React.useState('');
  const [leadZip, setLeadZip] = React.useState('');
  const [leadName, setLeadName] = React.useState('');
  const [leadError, setLeadError] = React.useState('');
  const [leadSubmitting, setLeadSubmitting] = React.useState(false);
  const [leadSuccess, setLeadSuccess] = React.useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const primaryColor = config.theme?.primary_color || '#DC143C';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onAskQuestion(input.trim());
      setInput('');
    }
  };

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLeadError('');
    if (!leadEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setLeadError('Please enter a valid email address.');
      return;
    }
    if (leadZip && !leadZip.match(/^\d{5}$/)) {
      setLeadError('Please enter a valid 5-digit ZIP code.');
      return;
    }
    setLeadSubmitting(true);
    const success = await onSubmitLead(
      leadEmail,
      leadZip || undefined,
      leadName || undefined,
      (leadFormCta as any)?.source_category,
      (leadFormCta as any)?.source_question_id
    );
    setLeadSubmitting(false);
    if (success) {
      setLeadSuccess(true);
      setTimeout(() => {
        setLeadSuccess(false);
        setLeadEmail('');
        setLeadZip('');
        setLeadName('');
        onCloseLeadForm();
      }, 2000);
    } else {
      setLeadError('Something went wrong. Please try again.');
    }
  };

  // Show initial quick buttons only before any messages
  const showInitialButtons = messages.length === 0;

  // Index of the last completed bot message (for showing topic pills after it)
  const lastBotIdx = messages.reduce(
    (acc, msg, idx) => (msg.role === 'assistant' && !msg.isLoading ? idx : acc),
    -1
  );

  return (
    <div className="ai-widget-panel">
      {/* Header */}
      <div className="ai-widget-header" style={{ backgroundColor: primaryColor }}>
        <div className="ai-widget-header-content">
          <div className="ai-widget-header-text">
            <span className="ai-widget-brand">{config.brand_name}</span>
            <span className="ai-widget-subtitle">Brian's Team</span>
          </div>
          <div className="ai-widget-header-badge">
            <span className="ai-widget-online-dot" />
            <span>Online</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="ai-widget-messages">

        {/* Config load error - panel still works with fallback */}
        {configError && (
          <div className="ai-widget-config-error" style={{ fontSize: 12, color: '#666', marginBottom: 8, padding: 6, background: '#f5f5f5', borderRadius: 4 }}>
            Using default settings. Config could not load: {configError}
          </div>
        )}

        {/* Welcome message */}
        <div className="ai-widget-welcome">
          <p>{config.welcome_message}</p>
        </div>

        {/* Initial quick buttons - only before first message */}
        {showInitialButtons && (
          <div className="ai-widget-quick-buttons">
            {QUICK_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => onQuickButtonClick(cat)}
                className="ai-widget-quick-btn"
                style={{ borderColor: primaryColor, color: primaryColor }}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Message list */}
        {messages.map((msg, idx) => (
          <div
            key={msg.id}
            className={`ai-widget-message ${msg.role === 'user' ? 'ai-widget-message-user' : 'ai-widget-message-bot'}`}
          >
            <div
              className="ai-widget-bubble-msg"
              style={msg.role === 'user' ? { backgroundColor: primaryColor } : {}}
            >
              {msg.isLoading ? (
                <div className="ai-widget-typing">
                  <span /><span /><span />
                </div>
              ) : (
                <p>{msg.content}</p>
              )}
            </div>

            {/* CTA Button */}
            {msg.cta && !msg.isLoading && (
              <button
                onClick={() => onCtaClick(msg.cta)}
                className="ai-widget-cta-btn"
                style={{ backgroundColor: primaryColor }}
              >
                {msg.cta.label}
              </button>
            )}

            {/* Persistent topic pills after the last completed bot answer */}
            {idx === lastBotIdx && (
              <div className="ai-widget-topic-pills">
                <p className="ai-widget-topic-label">Explore more topics:</p>
                <div className="ai-widget-pills-scroll">
                  {QUICK_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => onQuickButtonClick(cat)}
                      className="ai-widget-pill"
                      style={{ borderColor: primaryColor, color: primaryColor }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Lead Capture Form */}
      {showLeadForm && (
        <div className="ai-widget-lead-form">
          {leadSuccess ? (
            <div className="ai-widget-lead-success">
              Thanks! We'll be in touch soon.
            </div>
          ) : (
            <form onSubmit={handleLeadSubmit}>
              <p className="ai-widget-lead-title">Stay updated on Brian's campaign</p>
              <input
                type="text"
                value={leadName}
                onChange={(e) => setLeadName(e.target.value)}
                placeholder="Your name (optional)"
                className="ai-widget-input"
              />
              <input
                type="email"
                value={leadEmail}
                onChange={(e) => setLeadEmail(e.target.value)}
                placeholder="Email address *"
                required
                className="ai-widget-input"
              />
              <input
                type="text"
                value={leadZip}
                onChange={(e) => setLeadZip(e.target.value.replace(/\D/g, '').slice(0, 5))}
                placeholder="ZIP code (optional)"
                className="ai-widget-input"
              />
              {leadError && <p className="ai-widget-lead-error">{leadError}</p>}
              <div className="ai-widget-lead-actions">
                <button
                  type="button"
                  onClick={onCloseLeadForm}
                  className="ai-widget-btn-cancel"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={leadSubmitting}
                  className="ai-widget-btn-submit"
                  style={{ backgroundColor: primaryColor }}
                >
                  {leadSubmitting ? 'Submitting...' : 'Stay Updated'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Input */}
      {!showLeadForm && (
        <form onSubmit={handleSend} className="ai-widget-input-area">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your question..."
            className="ai-widget-text-input"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="ai-widget-send-btn"
            style={{ backgroundColor: primaryColor }}
            aria-label="Send"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="white" width={18} height={18}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.269 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </button>
        </form>
      )}

      {/* Footer */}
      <div className="ai-widget-footer">
        Automated assistant · Responses may vary
      </div>
    </div>
  );
}
