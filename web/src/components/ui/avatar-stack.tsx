import { levelColor } from "@/lib/theme/level";

type AvatarRunner = { id: string; name: string; level: number };

export function AvatarStack({
  runners,
  max = 5,
}: {
  runners: AvatarRunner[];
  max?: number;
}) {
  const shown = runners.slice(0, max);
  const rest = runners.length - max;

  return (
    <div className="flex items-center">
      {shown.map((r, i) => {
        const lc = levelColor(r.level);
        return (
          <div
            key={r.id}
            title={r.name}
            className="relative flex h-7 w-7 items-center justify-center rounded-full border-2 text-[11px] font-extrabold"
            style={{
              background: lc.bg,
              color: lc.color,
              borderColor: "var(--card)",
              marginLeft: i === 0 ? 0 : -8,
              zIndex: shown.length - i,
            }}
          >
            {r.name[0]}
          </div>
        );
      })}
      {rest > 0 && (
        <div
          className="relative flex h-7 w-7 items-center justify-center rounded-full border-2 text-[10px] font-bold"
          style={{
            background: "var(--background-subtle)",
            color: "var(--muted)",
            borderColor: "var(--card)",
            marginLeft: -8,
            zIndex: 0,
          }}
        >
          +{rest}
        </div>
      )}
    </div>
  );
}
