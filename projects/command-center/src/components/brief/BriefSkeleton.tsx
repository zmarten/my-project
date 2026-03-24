export default function BriefSkeleton() {
  return (
    <div className="max-w-[720px] mx-auto px-5 pb-16 animate-pulse">
      {/* Masthead skeleton */}
      <div className="pt-8 pb-6 border-b-2 border-accent-green/30 mb-0">
        <div className="flex justify-between mb-4">
          <div className="h-3 w-24 bg-bg-card rounded" />
          <div className="h-3 w-32 bg-bg-card rounded" />
        </div>
        <div className="h-10 w-56 bg-bg-card rounded mb-3" />
        <div className="flex gap-5">
          <div className="h-3 w-16 bg-bg-card rounded" />
          <div className="h-3 w-20 bg-bg-card rounded" />
          <div className="h-3 w-24 bg-bg-card rounded" />
        </div>
      </div>

      {/* Lead skeleton */}
      <div className="py-7 border-t border-border space-y-2">
        <div className="h-5 w-full bg-bg-card rounded" />
        <div className="h-5 w-5/6 bg-bg-card rounded" />
        <div className="h-5 w-4/6 bg-bg-card rounded" />
      </div>

      {/* Weather skeleton */}
      <div className="border-t border-border py-6">
        <div className="h-3 w-20 bg-bg-card rounded mb-4" />
        <div className="h-16 w-full bg-bg-card rounded-[10px]" />
      </div>

      {/* Focus skeleton */}
      <div className="border-t border-border py-6">
        <div className="h-3 w-24 bg-bg-card rounded mb-4" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 bg-bg-card rounded-[10px]" />
          ))}
        </div>
      </div>

      {/* Timeline skeleton */}
      <div className="border-t border-border py-6">
        <div className="h-3 w-16 bg-bg-card rounded mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-3.5">
              <div className="h-4 w-14 bg-bg-card rounded" />
              <div className="w-1 h-12 bg-bg-card rounded" />
              <div className="flex-1 space-y-1">
                <div className="h-4 w-3/4 bg-bg-card rounded" />
                <div className="h-3 w-1/2 bg-bg-card rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
