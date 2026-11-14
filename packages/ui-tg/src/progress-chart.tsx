export interface ChartPoint {
  label: string;
  value: number;
}

interface Props {
  points: readonly ChartPoint[];
  max: number;
  emptyLabel: string;
  /** Ekran o'quvchi uchun qisqa tavsif. */
  summary: string;
}

/** O'zbekcha o'nlik ajratuvchi — vergul (`4,2`). */
const NUM = new Intl.NumberFormat('uz', { maximumFractionDigits: 1 });

const W = 320;
const H = 140;
const PAD = 24;

/** Progress grafigi (MG-02, FR-GRD-5): bo'sh / bitta nuqta / ko'p. Ranglar — tokenlar. */
export function ProgressChart({ points, max, emptyLabel, summary }: Props) {
  if (points.length === 0)
    return <p className="rounded-xl bg-bg p-6 text-center text-sm text-text-muted">{emptyLabel}</p>;
  const step = points.length > 1 ? (W - PAD * 2) / (points.length - 1) : 0;
  const xy = points.map((p, i) => ({
    ...p,
    x: points.length > 1 ? PAD + i * step : W / 2,
    y: H - PAD - (Math.min(p.value, max) / max) * (H - PAD * 2),
  }));
  return (
    <figure className="rounded-xl bg-bg p-3">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={summary} className="w-full">
        <line x1={PAD} x2={W - PAD} y1={H - PAD} y2={H - PAD} className="stroke-border" />
        {xy.length > 1 && (
          <polyline
            points={xy.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="none"
            strokeWidth={2.5}
            strokeLinejoin="round"
            className="stroke-primary"
          />
        )}
        {xy.map((p) => (
          <g key={p.label}>
            <circle cx={p.x} cy={p.y} r={4} className="fill-primary" />
            <text
              x={p.x}
              y={p.y - 9}
              textAnchor="middle"
              className="fill-text text-[11px] font-semibold"
            >
              {NUM.format(p.value)}
            </text>
            <text x={p.x} y={H - 6} textAnchor="middle" className="fill-text-muted text-[10px]">
              {p.label}
            </text>
          </g>
        ))}
      </svg>
    </figure>
  );
}
