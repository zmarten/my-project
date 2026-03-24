interface IntelItem {
  source: string;
  category: string;
  headline: string;
  why: string;
}

interface IntelFeedProps {
  items: IntelItem[];
}

export default function IntelFeed({ items }: IntelFeedProps) {
  return (
    <div>
      {items.map((item, i) => (
        <div
          key={i}
          className={`py-3 ${i < items.length - 1 ? "border-b border-border" : ""}`}
        >
          <div className="flex items-center gap-1.5 font-mono text-[9px] tracking-[0.08em] uppercase text-text-muted mb-1">
            <span className="w-1 h-1 rounded-full bg-accent-teal inline-block" />
            {item.source}
            <span className="text-[#2a3530]">·</span>
            {item.category}
          </div>
          <div className="text-[14px] font-medium leading-snug text-text-primary mb-1">
            {item.headline}
          </div>
          <div className="text-[12px] text-text-secondary italic leading-snug">
            {item.why}
          </div>
        </div>
      ))}
    </div>
  );
}
