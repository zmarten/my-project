interface MastheadProps {
  date: string;         // ISO date string
  dayOfWeek: string;
  eventCount: number;
  openTasks: number;
  emailCount: number;
}

export default function Masthead({
  date,
  dayOfWeek,
  eventCount,
  openTasks,
  emailCount,
}: MastheadProps) {
  const d = new Date(date + "T12:00:00"); // noon to avoid timezone offset issues
  const month = d.toLocaleDateString("en-US", { month: "long" });
  const day = d.getDate();

  return (
    <div className="pt-8 pb-6 border-b-2 border-accent-green mb-0 relative">
      <div className="absolute bottom-[-4px] left-0 right-0 h-px opacity-30 bg-accent-green" />

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.14em] uppercase text-accent-green">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-green shadow-[0_0_8px_rgba(74,222,128,0.5)] animate-pulse" />
          Daily Brief
        </div>
        <div className="font-mono text-[10px] text-text-muted tracking-wide">
          45.6770° N · 111.0429° W
        </div>
      </div>

      <h1>
        <span className="font-display text-[36px] font-extrabold tracking-tight leading-none text-text-primary">
          {month} {day}
        </span>
        <span className="font-display text-[36px] font-light italic text-text-secondary ml-2 leading-none">
          {dayOfWeek}
        </span>
      </h1>

      <div className="flex gap-5 mt-3 font-mono text-[11px] text-text-muted">
        <span className="flex items-center gap-1.5">
          <span className="w-[5px] h-[5px] rounded-full bg-accent-green inline-block" />
          {eventCount} events
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-[5px] h-[5px] rounded-full bg-accent-amber inline-block" />
          {openTasks} open tasks
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-[5px] h-[5px] rounded-full bg-accent-blue inline-block" />
          {emailCount} priority emails
        </span>
      </div>
    </div>
  );
}
