interface LoadingSkeletonProps {
  /** Number of skeleton rows */
  rows?: number;
  /** Show as grid cards instead of rows */
  grid?: boolean;
  /** Grid columns */
  cols?: number;
}

export function LoadingSkeleton({ rows = 5, grid = false, cols = 3 }: LoadingSkeletonProps) {
  if (grid) {
    const total = Math.max(1, rows * cols);
    const gridClass =
      cols <= 1 ? 'grid-cols-1' :
      cols === 2 ? 'grid-cols-2' :
      cols === 3 ? 'grid-cols-3' :
      cols === 4 ? 'grid-cols-4' : 'grid-cols-5';

    return (
      <div className={`grid ${gridClass} gap-3`}>
        {Array.from({ length: total }).map((_, idx) => (
          <div key={idx} className="rounded-lg border border-border-default bg-surface-secondary p-3 space-y-2 animate-pulse">
            <div className="h-24 rounded bg-surface-elevated/80" />
            <div className="h-3 w-3/4 rounded bg-surface-elevated/80" />
            <div className="h-3 w-1/2 rounded bg-surface-elevated/80" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {Array.from({ length: Math.max(1, rows) }).map((_, idx) => (
        <div key={idx} className="h-5 rounded bg-surface-elevated/80 animate-pulse" />
      ))}
    </div>
  );
}
