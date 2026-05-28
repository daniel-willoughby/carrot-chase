/**
 * Minimal SVG line chart for trend visualisations.
 * No dependency, server-renderable. Designed to match the prototype's
 * Runner Growth chart aesthetic — area fill in orange tint, line + dots in orange.
 */
type Props = {
  data: { label: string; value: number }[];
  height?: number;
  width?: number;
  colour?: string;
};

export function LineChart({
  data,
  height = 220,
  width = 800,
  colour = "var(--orange)",
}: Props) {
  if (data.length === 0) return null;

  const padding = { top: 20, right: 20, bottom: 28, left: 44 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const max = Math.max(...data.map((d) => d.value));
  const min = Math.min(0, ...data.map((d) => d.value));
  const range = max - min || 1;

  // Y-axis ticks (4 evenly spaced)
  const yTicks = Array.from({ length: 5 }, (_, i) => max - (range * i) / 4);

  const xStep = innerW / Math.max(1, data.length - 1);
  const points = data.map((d, i) => ({
    x: padding.left + i * xStep,
    y: padding.top + (1 - (d.value - min) / range) * innerH,
    label: d.label,
    value: d.value,
  }));

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");
  const areaPath =
    `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${padding.top + innerH} ` +
    `L ${points[0].x.toFixed(1)} ${padding.top + innerH} Z`;

  function formatTick(v: number) {
    if (v >= 1000) return `${(v / 1000).toFixed(1)}k`.replace(".0k", "k");
    return Math.round(v).toString();
  }

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="h-auto w-full"
      style={{ maxHeight: height }}
    >
      <defs>
        <linearGradient id="area-fade" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={colour} stopOpacity="0.18" />
          <stop offset="100%" stopColor={colour} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Y-axis ticks + grid lines */}
      {yTicks.map((tick, i) => {
        const y = padding.top + (innerH * i) / 4;
        return (
          <g key={i}>
            <text
              x={padding.left - 8}
              y={y + 3}
              textAnchor="end"
              fontSize="10"
              fill="var(--muted)"
              fontFamily="Satoshi, sans-serif"
            >
              {formatTick(tick)}
            </text>
            <line
              x1={padding.left}
              x2={padding.left + innerW}
              y1={y}
              y2={y}
              stroke="var(--border)"
              strokeDasharray="2 4"
              opacity={i === 4 ? 1 : 0.35}
            />
          </g>
        );
      })}

      {/* Area + line */}
      <path d={areaPath} fill="url(#area-fade)" />
      <path d={linePath} fill="none" stroke={colour} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

      {/* Dots */}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="white" stroke={colour} strokeWidth="2" />
      ))}

      {/* X-axis labels */}
      {points.map((p, i) => (
        <text
          key={i}
          x={p.x}
          y={height - 10}
          textAnchor="middle"
          fontSize="10"
          fill="var(--muted)"
          fontFamily="Satoshi, sans-serif"
        >
          {p.label}
        </text>
      ))}
    </svg>
  );
}
