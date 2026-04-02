import React from 'react';

export default function Pagination({ totalItems, pageSize, currentPage, onPageChange }) {
  const totalPages = Math.max(1, Math.ceil((totalItems || 0) / pageSize));
  if (totalPages <= 1) return null;

  const pages = [];
  for (let i = 1; i <= totalPages; i += 1) pages.push(i);

  return (
    <nav className="flex items-center justify-center mt-6" aria-label="Pagination">
      <button
        type="button"
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="px-3 py-1 rounded-l-lg bg-slate-900 border border-slate-800 text-sm font-bold text-slate-300 hover:bg-slate-800 disabled:opacity-40"
      >
        Prev
      </button>
      <div className="inline-flex -space-x-px">
        {pages.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p)}
            className={`px-3 py-1 border-t border-b border-slate-800 text-sm font-bold ${
              p === currentPage ? 'bg-amber-500 text-slate-900' : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
            }`}
          >
            {p}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className="px-3 py-1 rounded-r-lg bg-slate-900 border border-slate-800 text-sm font-bold text-slate-300 hover:bg-slate-800 disabled:opacity-40"
      >
        Next
      </button>
    </nav>
  );
}
