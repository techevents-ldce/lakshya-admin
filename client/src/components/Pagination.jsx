/**
 * Reusable Pagination component with prev/next and ellipsis.
 * Shows at most 7 page buttons (5 around current + first + last).
 *
 * Props:
 *   page:    current page (1-indexed)
 *   pages:   total number of pages
 *   onPage:  callback (newPage: number) => void
 */
export default function Pagination({ page, pages, onPage }) {
  if (!pages || pages <= 1) return null;

  const getRange = () => {
    const delta = 2; // pages on each side of current
    const range = [];
    const left = Math.max(2, page - delta);
    const right = Math.min(pages - 1, page + delta);

    range.push(1);
    if (left > 2) range.push('...');
    for (let i = left; i <= right; i++) range.push(i);
    if (right < pages - 1) range.push('...');
    if (pages > 1) range.push(pages);

    return range;
  };

  const btnBase =
    'w-10 h-10 rounded-lg text-xs font-bold transition-all flex items-center justify-center select-none';
  const btnActive = 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40';
  const btnInactive = 'bg-slate-900 text-slate-500 hover:text-white border border-slate-800 hover:border-slate-700';
  const btnDisabled = 'opacity-20 pointer-events-none bg-slate-900 border border-slate-800 text-slate-500';

  return (
    <div className="flex items-center justify-center gap-2 py-10 bg-white/[0.01] border-t border-white/[0.05]">
      {/* Prev */}
      <button
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
        className={`${btnBase} ${page <= 1 ? btnDisabled : btnInactive}`}
        aria-label="Previous page"
      >
        ‹
      </button>

      {/* Page numbers */}
      {getRange().map((p, idx) =>
        p === '...' ? (
          <span
            key={`ellipsis-${idx}`}
            className="w-10 h-10 flex items-center justify-center text-slate-600 text-sm select-none"
          >
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPage(p)}
            className={`${btnBase} ${page === p ? btnActive : btnInactive}`}
            aria-label={`Page ${p}`}
            aria-current={page === p ? 'page' : undefined}
          >
            {String(p).padStart(2, '0')}
          </button>
        )
      )}

      {/* Next */}
      <button
        disabled={page >= pages}
        onClick={() => onPage(page + 1)}
        className={`${btnBase} ${page >= pages ? btnDisabled : btnInactive}`}
        aria-label="Next page"
      >
        ›
      </button>
    </div>
  );
}
