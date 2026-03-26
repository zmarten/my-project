const COLOR_MAP: Record<string, string> = {
  "accent-green": "border-accent-green/30 border-t-accent-green",
  "accent-teal": "border-accent-teal/30 border-t-accent-teal",
  "accent-blue": "border-accent-blue/30 border-t-accent-blue",
  "accent-amber": "border-accent-amber/30 border-t-accent-amber",
  "accent-red": "border-accent-red/30 border-t-accent-red",
};

export default function Spinner({
  size = "md",
  color = "accent-green",
}: {
  size?: "sm" | "md";
  color?: string;
}) {
  const sizeClass = size === "sm" ? "w-3 h-3 border" : "w-5 h-5 border-2";
  const colorClass = COLOR_MAP[color] ?? COLOR_MAP["accent-green"];
  return (
    <div
      className={`${sizeClass} ${colorClass} rounded-full animate-spin`}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading</span>
    </div>
  );
}
