const iconBg: Record<string, string> = {
  green: "bg-accent-green/10",
  amber: "bg-accent-amber/10",
  blue: "bg-accent-blue/10",
  red: "bg-accent-red/10",
  teal: "bg-accent-teal/10",
};

const barFill: Record<string, string> = {
  green: "bg-accent-green",
  amber: "bg-accent-amber",
  blue: "bg-accent-blue",
  red: "bg-accent-red",
  teal: "bg-accent-teal",
};

interface GoalActionItem {
  goal_name: string;
  action: string;
  why: string;
  progress: number;
  color: "green" | "amber" | "blue" | "red" | "teal";
  icon: string;
}

interface GoalActionsProps {
  items: GoalActionItem[];
}

export default function GoalActions({ items }: GoalActionsProps) {
  return (
    <div className="flex flex-col gap-2.5">
      {items.map((item, i) => (
        <div
          key={item.goal_name || i}
          className="flex items-start gap-3.5 px-4 py-3.5 bg-bg-card border border-border rounded-[10px] hover:border-border-hover transition-colors"
        >
          <div
            className={`w-9 h-9 flex items-center justify-center rounded-lg text-lg flex-shrink-0 ${iconBg[item.color] ?? "bg-accent-green/10"}`}
          >
            {item.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-mono uppercase tracking-wide text-text-muted mb-0.5">
              {item.goal_name}
            </div>
            <div className="text-[13px] font-medium leading-snug text-text-primary mb-1">
              {item.action}
            </div>
            <div className="text-[12px] text-text-muted italic leading-snug">
              {item.why}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1 h-1 bg-[#1a231e] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${barFill[item.color] ?? "bg-accent-green"}`}
                  style={{ width: `${item.progress}%` }}
                />
              </div>
              <span className="font-mono text-[10px] text-text-muted min-w-[30px] text-right">
                {item.progress}%
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
