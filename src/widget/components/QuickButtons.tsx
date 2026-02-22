/**
 * Quick action buttons from FAQ categories.
 */

interface QuickButtonsProps {
  buttons: Array<{ label: string; category: string; question?: string }>;
  onSelect: (category: string, label: string, question?: string) => void;
  disabled?: boolean;
  className?: string;
}

export default function QuickButtons({ buttons, onSelect, disabled, className }: QuickButtonsProps) {
  if (buttons.length === 0) return null;

  return (
    <div className={`ai-widget-quick-buttons${className ? ` ${className}` : ''}`}>
      {buttons.map((btn) => (
        <button
          key={`${btn.category}-${btn.label}`}
          type="button"
          onClick={() => onSelect(btn.category, btn.label, btn.question)}
          disabled={disabled}
          className="ai-widget-quick-btn"
        >
          {btn.label}
        </button>
      ))}
    </div>
  );
}
