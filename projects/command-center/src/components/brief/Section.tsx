interface SectionProps {
  label: string;
  children: React.ReactNode;
  className?: string;
}

export default function Section({ label, children, className = "" }: SectionProps) {
  return (
    <div className={`border-t border-border py-6 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <span className="font-mono text-[9px] tracking-[0.16em] uppercase text-text-muted">
          {label}
        </span>
        <div className="flex-1 h-px bg-border" />
      </div>
      {children}
    </div>
  );
}
