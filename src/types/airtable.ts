export interface AirtableFAQ {
  id: string;
  fields: {
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
  };
}

export interface AirtableConfig {
  id: string;
  fields: {
    key: string;
    value: string;
  };
}

export interface AirtableLead {
  fields: {
    email: string;
    zip?: string;
    name?: string;
    tags?: string[];
    source: 'web' | 'sms';
    source_category?: string;
    source_question_id?: string;
    session_duration_seconds?: number;
    questions_asked_count?: number;
    created_at: string;
  };
}

export interface AirtableLog {
  fields: {
    event_name: string;
    session_id: string;
    payload_json: string;
    user_agent?: string;
    referrer?: string;
    created_at: string;
  };
}
