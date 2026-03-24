const accentColors = [
  "from-accent-green",
  "from-accent-amber",
  "from-accent-blue",
  "from-accent-red",
];

const valueColors = [
  "text-accent-green",
  "text-accent-amber",
  "text-accent-blue",
  "text-accent-red",
];

interface FocusItem {
  label: string;
  value: string;
  detail: string;
}

interface FocusGridProps {
  items: FocusItem[];
}

export default function FocusGrid({ items }: FocusGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map((item, i) => (
        <div
          key={i}
          className="bg-bg-card border border-border rounded-[10px] p-4 relative overflow-hidden hover:border-border-hover transition-colors"
        >
          <div
            className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${accentColors[i] ?? "from-accent-green"} to-transparent`}
          />
          <div className="font-mono text-[9px] tracking-[0.1em] uppercase text-text-muted mb-2">
            {item.label}
          </div>
          <div
            className={`font-display text-[22px] font-medium leading-none ${valueColors[i] ?? "text-accent-green"}`}
          >
            {item.value}
          </div>
          <div className="text-[11px] text-text-muted mt-1">{item.detail}</div>
        </div>
      ))}
    </div>
  );
}
