interface BriefErrorProps {
  message: string;
  onRetry: () => void;
}

export default function BriefError({ message, onRetry }: BriefErrorProps) {
  return (
    <div className="max-w-[720px] mx-auto px-5 pt-16 text-center">
      <div className="font-mono text-[10px] tracking-widest uppercase text-accent-red mb-3">
        Brief unavailable
      </div>
      <div className="font-display text-[18px] font-light italic text-text-secondary mb-6">
        {message}
      </div>
      <button
        onClick={onRetry}
        className="font-mono text-xs text-text-muted hover:text-accent-green transition-colors"
      >
        ↻ Try again
      </button>
    </div>
  );
}
