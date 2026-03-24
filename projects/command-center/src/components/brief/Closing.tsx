interface ClosingProps {
  quote: string;
  attribution: string;
}

export default function Closing({ quote, attribution }: ClosingProps) {
  return (
    <div className="py-7 border-t-2 border-border text-center">
      <div className="font-display text-[16px] font-light italic text-text-secondary leading-relaxed">
        &ldquo;{quote}&rdquo;
      </div>
      <div className="font-mono text-[10px] text-text-muted mt-2 tracking-wide">
        — {attribution}
      </div>
    </div>
  );
}
