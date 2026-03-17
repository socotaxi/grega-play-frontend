import { useMemo } from 'react';

export default function MiniLineChart({
  title,
  data,
  valueKey,
  dateKey = 'snapshot_date',
  height = 100,
}) {
  // Unique gradient ID derived from title
  const gradId = `mlc-grad-${title.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '').toLowerCase()}`;

  const points = useMemo(() => {
    if (!Array.isArray(data) || data.length < 2) return null;

    const values = data.map((d) => Number(d?.[valueKey] ?? 0));
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const w = 520;
    const h = height;
    const padX = 6;
    const padY = 10;
    const xStep = (w - padX * 2) / (values.length - 1);
    const baseline = h - padY;

    const pts = values.map((v, i) => {
      const x = padX + i * xStep;
      const y = padY + (h - padY * 2) - ((v - min) / range) * (h - padY * 2);
      return { x, y, v };
    });

    const linePath = pts
      .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
      .join(' ');

    const lastPt = pts[pts.length - 1];
    const fillPath =
      linePath +
      ` L ${lastPt.x} ${baseline} L ${pts[0].x} ${baseline} Z`;

    const last = lastPt?.v ?? 0;
    const first = pts[0]?.v ?? 0;
    const delta = last - first;

    return {
      linePath,
      fillPath,
      min, max, last, first, delta,
      w, h,
      lastCx: lastPt?.x,
      lastCy: lastPt?.y,
    };
  }, [data, valueKey, height]);

  const lastDateLabel = useMemo(() => {
    const last = data?.[data.length - 1];
    if (!last?.[dateKey]) return null;
    return new Date(last[dateKey]).toLocaleDateString('fr-FR');
  }, [data, dateKey]);

  return (
    <div className="rounded-2xl border border-emerald-100 bg-white shadow-sm p-4">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <p className="text-xs text-gray-500">{title}</p>
          <p className="mt-0.5 text-xl font-bold text-gray-900 leading-none">
            {points ? points.last.toLocaleString('fr-FR') : '—'}
          </p>
          {lastDateLabel && (
            <p className="text-[11px] text-gray-400 mt-0.5">Au {lastDateLabel}</p>
          )}
        </div>

        {points ? (
          <div className="text-right shrink-0">
            <p
              className={`text-xs font-semibold ${
                points.delta >= 0 ? 'text-emerald-600' : 'text-red-500'
              }`}
            >
              {points.delta >= 0 ? '▲' : '▼'}{' '}
              {points.delta >= 0 ? '+' : ''}{points.delta}
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">
              {points.min} – {points.max}
            </p>
          </div>
        ) : (
          <p className="text-[11px] text-gray-400">{'< 2 points'}</p>
        )}
      </div>

      <svg
        viewBox={`0 0 520 ${height}`}
        className="w-full"
        role="img"
        aria-label={title}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(16,185,129,0.20)" />
            <stop offset="100%" stopColor="rgba(16,185,129,0)" />
          </linearGradient>
        </defs>

        {points ? (
          <>
            {/* Area fill */}
            <path d={points.fillPath} fill={`url(#${gradId})`} />
            {/* Line */}
            <path
              d={points.linePath}
              fill="none"
              stroke="rgba(16,185,129,0.9)"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            {/* Last point dot */}
            <circle
              cx={points.lastCx}
              cy={points.lastCy}
              r="3.5"
              fill="rgb(16,185,129)"
            />
          </>
        ) : (
          <line
            x1="6" y1={height / 2}
            x2="514" y2={height / 2}
            stroke="rgba(15,23,42,0.06)"
            strokeDasharray="4 4"
          />
        )}
      </svg>
    </div>
  );
}
