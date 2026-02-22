export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  cta?: {
    label: string;
    url?: string;
    action?: 'lead_capture' | 'external_link';
  };
  isLoading?: boolean;
}

export interface WidgetConfig {
  brand_name: string;
  welcome_message: string;
  quick_buttons: Array<{ label: string; category: string; question?: string }>;
  theme?: {
    primary_color?: string;
    font_family?: string;
  };
  fallback_message: string;
}

export interface WidgetState {
  isOpen: boolean;
  messages: Message[];
  sessionId: string;
  hasSubmittedLead: boolean;
}
