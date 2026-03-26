"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center relative z-10">
      <div className="bg-bg-card border border-border rounded-xl p-5 max-w-sm w-full mx-4 text-center">
        <h2 className="font-display text-xl font-bold mb-2">Something went wrong</h2>
        <p className="text-text-secondary text-sm mb-4">
          {process.env.NODE_ENV === "development"
            ? error.message
            : "An unexpected error occurred. Please try again."}
        </p>
        {error.digest && (
          <p className="text-text-muted text-xs mb-4">Ref: {error.digest}</p>
        )}
        <button
          onClick={reset}
          className="bg-accent-green/15 text-accent-green px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent-green/25 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
