export default function KpiCard({ label, value, description, trend, dark = false }) {
  // trend: { delta: number, unit?: string } | null
  const up = trend?.delta >= 0;

  return (
    <div
      className={`rounded-2xl border shadow-sm p-4 flex flex-col gap-1 ${
        dark
          ? 'border-emerald-500 bg-emerald-600 text-white'
          : 'border-emerald-100 bg-white'
      }`}
    >
      <p className={`text-xs font-medium truncate ${dark ? 'text-emerald-100' : 'text-gray-500'}`}>
        {label}
      </p>

      <p className={`text-2xl font-bold tracking-tight leading-none mt-0.5 ${dark ? 'text-white' : 'text-gray-900'}`}>
        {value ?? '—'}
      </p>

      {trend != null ? (
        <p
          className={`text-[11px] font-semibold mt-0.5 ${
            dark
              ? up ? 'text-emerald-200' : 'text-red-300'
              : up ? 'text-emerald-600' : 'text-red-500'
          }`}
        >
          {up ? '▲' : '▼'}{' '}
          {trend.delta > 0 ? '+' : ''}{trend.delta}
          {trend.unit ? ` ${trend.unit}` : ''}
          {' '}vs snapshot précédent
        </p>
      ) : description ? (
        <p className={`text-[11px] mt-0.5 ${dark ? 'text-emerald-100' : 'text-gray-400'}`}>
          {description}
        </p>
      ) : null}
    </div>
  );
}
