// Pure-SVG line/area chart with an animated draw-in (see globals.css .spark-line).
export default function Sparkline({ data, height = 110, stroke = "var(--neon)" }: { data: number[]; height?: number; stroke?: string }) {
  const W = 600;
  const H = height;
  const pad = 6;
  const max = Math.max(1, ...data);
  const n = data.length;
  const x = (i: number) => pad + (i * (W - pad * 2)) / Math.max(1, n - 1);
  const y = (v: number) => H - pad - (v / max) * (H - pad * 2);
  const line = data.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const area = `${line} L${x(n - 1).toFixed(1)} ${H} L${x(0).toFixed(1)} ${H} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height }}>
      <defs>
        <linearGradient id="sparkfill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#sparkfill)" />
      <path className="spark-line" d={line} fill="none" stroke={stroke} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {data.map((v, i) => (
        <circle key={i} cx={x(i)} cy={y(v)} r="2.5" fill={stroke} opacity={i === n - 1 ? 1 : 0.4} />
      ))}
    </svg>
  );
}
