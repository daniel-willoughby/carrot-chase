/**
 * The Carrot Chase wordmark: gradient orange tile with a carrot inside,
 * followed by the product name. Used in headers and auth screens.
 */
export function CarrotMark({
  size = "md",
  showWordmark = true,
}: {
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
}) {
  const tileSize = size === "sm" ? 32 : size === "lg" ? 64 : 40;
  const tileRadius = size === "sm" ? 10 : size === "lg" ? 18 : 12;
  const fontSize = size === "sm" ? 18 : size === "lg" ? 32 : 20;
  const carrotSize = Math.round(tileSize * 0.55);

  return (
    <div className="flex items-center gap-3">
      <div
        className="flex items-center justify-center bg-orange-gradient shadow-[0_8px_24px_rgba(232,82,10,0.35)]"
        style={{
          width: tileSize,
          height: tileSize,
          borderRadius: tileRadius,
          fontSize: carrotSize,
        }}
        aria-hidden
      >
        🥕
      </div>
      {showWordmark && (
        <span
          className="font-extrabold tracking-tight text-[color:var(--foreground)]"
          style={{ fontSize, letterSpacing: "-0.03em" }}
        >
          Carrot Chase
        </span>
      )}
    </div>
  );
}
