export type DonutSlice = { label: string; value: number; color: string };

export default function Donut({ data, total, centerLabel }: { data: DonutSlice[]; total?: number; centerLabel?: string }) {
  const sum = total ?? data.reduce((s, d) => s + d.value, 0);
  const R = 54, C = 64, SW = 18;
  const circ = 2 * Math.PI * R;
  let offset = 0;
  return (
    <div className="donut-wrap">
      <svg viewBox="0 0 128 128" className="donut-svg" style={{ width: 150, height: 150 }}>
        <circle cx={C} cy={C} r={R} fill="none" stroke="var(--panel-2)" strokeWidth={SW} />
        {data.map((d, i) => {
          const frac = sum ? d.value / sum : 0;
          const len = frac * circ;
          const seg = (
            <circle
              key={i}
              cx={C} cy={C} r={R} fill="none"
              stroke={d.color} strokeWidth={SW}
              strokeDasharray={`${len} ${circ - len}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${C} ${C})`}
              className="donut-seg"
              style={{ animationDelay: `${i * 0.08}s` }}
            />
          );
          offset += len;
          return seg;
        })}
        <text x={C} y={C - 4} textAnchor="middle" className="donut-total">{sum.toLocaleString("en-US")}</text>
        <text x={C} y={C + 12} textAnchor="middle" className="donut-sub">{centerLabel ?? "total"}</text>
      </svg>
      <div className="donut-legend">
        {data.map((d, i) => (
          <div className="dl-row" key={i}>
            <i style={{ background: d.color }} />
            <span className="dl-l">{d.label}</span>
            <span className="dl-v">{d.value.toLocaleString("en-US")}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
