// src/components/ui/CountdownTimer.jsx
import { useState, useEffect } from "react";
import { HiClock, HiBolt, HiExclamationTriangle } from "react-icons/hi2";

function getTimeLeft(deadlineIso) {
  const end = new Date(deadlineIso);
  end.setHours(23, 59, 59, 999);
  const diff = end - Date.now();
  if (diff <= 0) return null;
  const totalSec = Math.floor(diff / 1000);
  return {
    days:    Math.floor(totalSec / 86400),
    hours:   Math.floor((totalSec % 86400) / 3600),
    minutes: Math.floor((totalSec % 3600) / 60),
    seconds: totalSec % 60,
    totalMs: diff,
  };
}

function Pad({ n }) {
  return String(n).padStart(2, "0");
}

function Block({ value, label, urgent, critical }) {
  const bg      = critical ? "bg-red-500/20 border-red-500/40"
                : urgent   ? "bg-orange-500/20 border-orange-500/40"
                :            "bg-white/10 border-white/20";
  const text    = critical ? "text-red-300"
                : urgent   ? "text-orange-300"
                :            "text-white";
  const sublabel= critical ? "text-red-400/70"
                : urgent   ? "text-orange-400/70"
                :            "text-white/50";

  return (
    <div className={`flex flex-col items-center justify-center rounded-2xl border backdrop-blur-sm px-3 py-2.5 min-w-[56px] ${bg}`}>
      <span className={`text-2xl sm:text-3xl font-black tabular-nums leading-none ${text}`} style={{ fontVariantNumeric: "tabular-nums" }}>
        <Pad n={value} />
      </span>
      <span className={`text-[10px] font-semibold uppercase tracking-widest mt-1 ${sublabel}`}>{label}</span>
    </div>
  );
}

export default function CountdownTimer({ deadline }) {
  const [left, setLeft] = useState(() => getTimeLeft(deadline));

  useEffect(() => {
    setLeft(getTimeLeft(deadline));
    const id = setInterval(() => {
      const t = getTimeLeft(deadline);
      setLeft(t);
      if (!t) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [deadline]);

  if (!left) return null;

  const urgent   = left.totalMs < 24 * 3600 * 1000;
  const critical = left.totalMs <  3 * 3600 * 1000;

  const Icon = critical ? HiBolt : urgent ? HiExclamationTriangle : HiClock;

  const headerText = critical
    ? "Plus que quelques heures !"
    : urgent
    ? "Dernière chance !"
    : "Il te reste encore un peu de temps…";

  const headerColor = critical ? "text-red-300"
                    : urgent   ? "text-orange-300"
                    :            "text-white/70";

  const iconColor = critical ? "text-red-400"
                  : urgent   ? "text-orange-400"
                  :            "text-white/40";

  return (
    <div className={`rounded-2xl border backdrop-blur-sm px-5 py-4 flex flex-col items-center gap-3 ${
      critical ? "bg-red-500/10 border-red-500/25"
      : urgent ? "bg-orange-500/10 border-orange-500/25"
      :          "bg-white/5 border-white/15"
    }`}>
      <div className={`flex items-center gap-1.5 text-xs font-semibold tracking-wide ${headerColor}`}>
        <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
        {headerText}
      </div>

      <div className="flex items-center gap-2">
        {left.days > 0 && (
          <>
            <Block value={left.days}    label="jours"   urgent={urgent} critical={critical} />
            <span className="text-white/40 font-bold text-xl pb-3">:</span>
          </>
        )}
        <Block value={left.hours}   label="heures"  urgent={urgent} critical={critical} />
        <span className="text-white/40 font-bold text-xl pb-3">:</span>
        <Block value={left.minutes} label="min"     urgent={urgent} critical={critical} />
        <span className="text-white/40 font-bold text-xl pb-3">:</span>
        <Block value={left.seconds} label="sec"     urgent={urgent} critical={critical} />
      </div>

      <p className="text-[11px] text-white/40">pour envoyer ta vidéo</p>
    </div>
  );
}
