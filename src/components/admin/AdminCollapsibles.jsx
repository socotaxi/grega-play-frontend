import React from 'react';

export function CollapsibleSection({ title, right, defaultOpen = false, children }) {
  return (
    <details
      className="rounded-3xl border border-emerald-100 bg-white shadow-sm"
      open={defaultOpen}
    >
      <summary className="list-none cursor-pointer px-5 py-4 select-none">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-gray-800">{title}</span>
            <span className="text-xs text-gray-400">
              (cliquer pour ouvrir/fermer)
            </span>
          </div>
          <div className="flex items-center gap-3">
            {right}
            <span className="text-gray-400 text-sm">▾</span>
          </div>
        </div>
      </summary>
      <div className="px-5 pb-5 pt-1">{children}</div>
    </details>
  );
}

export function CollapsibleSubSection({ title, children, defaultOpen = true }) {
  return (
    <details
      className="rounded-3xl border border-emerald-100 bg-white/70"
      open={defaultOpen}
    >
      <summary className="list-none cursor-pointer px-4 py-3 select-none">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
            {title}
          </span>
          <span className="text-gray-400 text-sm">▾</span>
        </div>
      </summary>
      <div className="px-4 pb-4 pt-1">{children}</div>
    </details>
  );
}

export function AutoAnalysis({ children }) {
  return (
    <details className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50/40">
      <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-emerald-700 select-none">
        Analyse automatique
      </summary>
      <div className="px-3 pb-3 pt-1 text-xs text-gray-700 space-y-1">
        {children}
      </div>
    </details>
  );
}
