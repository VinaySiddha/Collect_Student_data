'use client';

interface Props {
  rows?: number;
  cols?: number;
}

export default function TableSkeleton({ rows = 6, cols = 4 }: Props) {
  return (
    <div className="animate-pulse">
      {/* Header */}
      <div className="flex gap-3 px-4 py-3 border-b border-slate-100 bg-slate-50">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className={`h-3 rounded bg-slate-200 ${i === 0 ? 'w-32' : i === cols - 1 ? 'w-16 ml-auto' : 'w-24'}`} />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-3 px-4 py-4 border-b border-slate-50">
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} className={`rounded bg-slate-100 ${c === 0 ? 'flex gap-2 items-center flex-1' : c === cols - 1 ? 'w-16 h-7 ml-auto' : 'h-3 flex-1'}`}>
              {c === 0 ? (
                <>
                  <div className="w-8 h-8 rounded-full bg-slate-200 shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-slate-200 rounded w-3/4" />
                    <div className="h-2.5 bg-slate-100 rounded w-1/2" />
                  </div>
                </>
              ) : (
                <div className="h-3 bg-slate-100 rounded w-full" />
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
