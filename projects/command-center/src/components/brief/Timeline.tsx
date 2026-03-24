const barColors: Record<string, string> = {
  green: "bg-accent-green",
  blue: "bg-accent-blue",
  amber: "bg-accent-amber",
  teal: "bg-accent-teal",
  red: "bg-accent-red",
};

const tagStyles: Record<string, string> = {
  event: "bg-accent-blue/10 text-accent-blue",
  task: "bg-accent-green/10 text-accent-green",
  goal: "bg-accent-amber/10 text-accent-amber",
};

interface TimelineItem {
  time: string;
  title: string;
  detail: string;
  type: "event" | "task" | "goal";
  color: "green" | "blue" | "amber" | "teal" | "red";
}

interface TimelineProps {
  items: TimelineItem[];
}

export default function Timeline({ items }: TimelineProps) {
  return (
    <div className="flex flex-col gap-0.5">
      {items.map((item, i) => (
        <div
          key={i}
          className="grid gap-3.5 py-2.5 px-2 -mx-2 rounded-lg hover:bg-accent-green/[0.03] transition-colors"
          style={{ gridTemplateColumns: "62px 4px 1fr" }}
        >
          <div className="font-mono text-[12px] text-text-muted pt-0.5 text-right">
            {item.time}
          </div>
          <div
            className={`w-1 rounded-sm self-stretch opacity-70 ${barColors[item.color] ?? "bg-accent-green"}`}
          />
          <div>
            <div className="text-[14px] font-medium leading-snug text-text-primary">
              {item.title}
            </div>
            <div className="text-[12px] text-text-muted mt-0.5">
              {item.detail}
            </div>
            <span
              className={`inline-block font-mono text-[9px] px-1.5 py-0.5 rounded mt-1 uppercase tracking-wide ${tagStyles[item.type] ?? tagStyles.event}`}
            >
              {item.type}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
