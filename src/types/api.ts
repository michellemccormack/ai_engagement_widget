export interface ChatRequest {
  message: string;
  session_id: string;
  context?: {
    previous_category?: string;
    conversation_history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  };
}

export interface ChatResponse {
  answer: string;
  category?: string;
  faq_id?: string;
  cta?: {
    label: string;
    url?: string;
    action?: 'lead_capture' | 'external_link';
  };
  confidence: number;
  related_questions?: string[];
  source: 'faq_match' | 'web_search' | 'no_match' | 'profanity_blocked' | 'gibberish_blocked' | 'hot_button_blocked' | 'cheat_filter';
}

export interface LeadRequest {
  email: string;
  zip?: string;
  name?: string;
  session_id: string;
  source_category?: string;
  source_question_id?: string;
  tags?: string[];
}

export interface ConfigResponse {
  brand_name: string;
  welcome_message: string;
  quick_buttons: Array<{
    label: string;
    category: string;
    question?: string;
  }>;
  theme?: {
    primary_color?: string;
    font_family?: string;
  };
  fallback_message: string;
  contact_cta_label: string;
  contact_cta_url?: string;
}

export interface LogEvent {
  event_name: 'widget_open' | 'button_click' | 'question_asked' | 'answer_served' | 'lead_captured' | 'cta_clicked';
  session_id: string;
  payload: Record<string, any>;
}
