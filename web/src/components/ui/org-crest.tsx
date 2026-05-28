/**
 * Carrot Chase — Organisation crests
 *
 * Six heraldic crests ported verbatim from the prototype. Real DB orgs have
 * UUIDs, so we hash the UUID into the 1-6 range — same org always shows the
 * same crest. Newer orgs added after the design will get one of the existing
 * six rather than a generic fallback.
 *
 * MIT-style SVG: no external assets. Each crest takes a unique `cid` prefix
 * so multiple instances coexist (clipPath / def collisions otherwise).
 */

import { useId } from "react";

const SHIELD =
  "M12,14 L88,14 L88,72 Q88,103 50,118 Q12,103 12,72 Z";
const SHIELD_INNER =
  "M16,18 L84,18 L84,71 Q84,100 50,114 Q16,100 16,71 Z";

function MottoBanner({
  text,
  color = "#F59E0B",
  dark = "#B45309",
}: {
  text: string;
  color?: string;
  dark?: string;
}) {
  return (
    <>
      <path d="M12,116 Q4,116 4,124 Q4,128 12,128 L12,122 Z" fill={dark} />
      <path d="M88,116 L88,122 Q96,128 96,124 Q96,116 88,116 Z" fill={dark} />
      <path d="M12,116 L88,116 L88,122 L12,122 Z" fill={color} />
      <text
        x="50"
        y="117.5"
        textAnchor="middle"
        fill="white"
        fontSize="4.6"
        fontWeight="bold"
        fontFamily="Georgia, serif"
        letterSpacing="0.5"
        opacity="0.96"
      >
        {text}
      </text>
    </>
  );
}

type CrestFn = (cid: string) => React.ReactNode;

const ORG_CRESTS: Record<1 | 2 | 3 | 4 | 5 | 6, CrestFn> = {
  // ─── 1. Hampton Primary School ──────────────────────────────────
  1: (cid) => (
    <>
      <g>
        <rect x="26" y="8" width="48" height="6" fill="#D97706" />
        <rect x="28" y="3" width="6" height="5" fill="#D97706" />
        <rect x="40" y="3" width="6" height="5" fill="#D97706" />
        <rect x="54" y="3" width="6" height="5" fill="#D97706" />
        <rect x="66" y="3" width="6" height="5" fill="#D97706" />
        <line x1="26" y1="10.5" x2="74" y2="10.5" stroke="#92400E" strokeWidth="0.5" opacity="0.55" />
        <rect x="49" y="9.5" width="2" height="2.5" fill="#92400E" opacity="0.4" />
      </g>
      <defs>
        <clipPath id={`${cid}-s`}><path d={SHIELD} /></clipPath>
      </defs>
      <path d={SHIELD} fill="#F8FAFC" />
      <g clipPath={`url(#${cid}-s)`}>
        <rect x="12" y="14" width="38" height="52" fill="#1E40AF" />
        <rect x="50" y="66" width="38" height="60" fill="#1E40AF" />
        <circle cx="31" cy="40" r="6.5" fill="#FBBF24" />
        <g stroke="#FBBF24" strokeWidth="1.6" strokeLinecap="round">
          <line x1="31" y1="26" x2="31" y2="30" />
          <line x1="31" y1="50" x2="31" y2="54" />
          <line x1="17" y1="40" x2="21" y2="40" />
          <line x1="41" y1="40" x2="45" y2="40" />
          <line x1="22" y1="31" x2="25" y2="34" />
          <line x1="37" y1="46" x2="40" y2="49" />
          <line x1="22" y1="49" x2="25" y2="46" />
          <line x1="37" y1="34" x2="40" y2="31" />
        </g>
        <g>
          <path d="M55,32 L66,34 L66,48 L55,46 Z" fill="white" stroke="#92400E" strokeWidth="0.5" />
          <path d="M77,32 L66,34 L66,48 L77,46 Z" fill="white" stroke="#92400E" strokeWidth="0.5" />
          <line x1="66" y1="34" x2="66" y2="48" stroke="#92400E" strokeWidth="0.6" />
          <line x1="57" y1="37" x2="64" y2="38" stroke="#1E40AF" strokeWidth="0.4" />
          <line x1="57" y1="40" x2="64" y2="41" stroke="#1E40AF" strokeWidth="0.4" />
          <line x1="57" y1="43" x2="64" y2="44" stroke="#1E40AF" strokeWidth="0.4" />
          <line x1="75" y1="37" x2="68" y2="38" stroke="#1E40AF" strokeWidth="0.4" />
          <line x1="75" y1="40" x2="68" y2="41" stroke="#1E40AF" strokeWidth="0.4" />
          <line x1="75" y1="43" x2="68" y2="44" stroke="#1E40AF" strokeWidth="0.4" />
        </g>
        <g>
          <ellipse cx="31" cy="92" rx="11" ry="3" fill="#FBBF24" stroke="#92400E" strokeWidth="0.4" />
          <path d="M21,92 Q21,85 31,83 Q41,85 41,92 Z" fill="#FBBF24" stroke="#92400E" strokeWidth="0.5" />
          <rect x="28" y="76" width="6" height="7" rx="0.5" fill="#FBBF24" stroke="#92400E" strokeWidth="0.4" />
          <path d="M31,70 Q34,74 31,78 Q28,74 31,70 Z" fill="#EA580C" />
          <path d="M30,72 Q32,75 30,77" fill="none" stroke="#FBBF24" strokeWidth="0.5" />
          <rect x="21" y="95" width="20" height="2" fill="#92400E" />
        </g>
        <polygon
          points="68,80 70.5,87 78,87 72,91.5 74.5,99 68,94.5 61.5,99 64,91.5 58,87 65.5,87"
          fill="#FBBF24"
          stroke="#B45309"
          strokeWidth="0.4"
        />
        <line x1="50" y1="14" x2="50" y2="118" stroke="#0F172A" strokeWidth="0.7" opacity="0.45" />
        <line x1="12" y1="66" x2="88" y2="66" stroke="#0F172A" strokeWidth="0.7" opacity="0.45" />
      </g>
      <path d={SHIELD} fill="none" stroke="#1E3A8A" strokeWidth="2.5" />
      <path d={SHIELD_INNER} fill="none" stroke="#93C5FD" strokeWidth="0.8" opacity="0.5" />
      <MottoBanner text="CARTHAGO DELENDA EST" />
    </>
  ),

  // ─── 2. Riverside Academy ───────────────────────────────────────
  2: (cid) => (
    <>
      <g>
        <rect x="26" y="9" width="48" height="5" fill="#D97706" />
        <path d="M30,9 L33,3 L36,9 Z" fill="#D97706" />
        <path d="M48,9 L51,3 L54,9 Z" fill="#D97706" />
        <path d="M66,9 L69,3 L72,9 Z" fill="#D97706" />
        <path d="M38,9 L38,7 Q42,5 46,7 L46,9 Z" fill="#D97706" />
        <path d="M56,9 L56,7 Q60,5 64,7 L64,9 Z" fill="#D97706" />
        <line x1="26" y1="11.5" x2="74" y2="11.5" stroke="#92400E" strokeWidth="0.5" opacity="0.5" />
      </g>
      <defs>
        <clipPath id={`${cid}-s`}><path d={SHIELD} /></clipPath>
      </defs>
      <path d={SHIELD} fill="#0E7490" />
      <g clipPath={`url(#${cid}-s)`}>
        <path
          d="M12,14 L88,14 L88,55 Q82,52 76,55 Q68,58 60,55 Q52,52 44,55 Q36,58 28,55 Q22,52 12,55 Z"
          fill="#FBBF24"
        />
        <g>
          <path d="M28,44 L72,44 L66,52 L34,52 Z" fill="#7F1D1D" stroke="#451A03" strokeWidth="0.4" />
          <line x1="50" y1="22" x2="50" y2="44" stroke="#451A03" strokeWidth="1.6" />
          <path d="M40,26 L60,26 L60,42 L40,42 Z" fill="#FEF3C7" stroke="#7F1D1D" strokeWidth="0.5" />
          <line x1="40" y1="34" x2="60" y2="34" stroke="#7F1D1D" strokeWidth="0.4" opacity="0.5" />
          <line x1="38" y1="26" x2="62" y2="26" stroke="#451A03" strokeWidth="1" />
          <path d="M50,22 L58,20 L50,18 Z" fill="#DC2626" />
          <line x1="32" y1="46" x2="28" y2="50" stroke="#451A03" strokeWidth="0.7" />
          <line x1="40" y1="46" x2="36" y2="50" stroke="#451A03" strokeWidth="0.7" />
          <line x1="60" y1="46" x2="64" y2="50" stroke="#451A03" strokeWidth="0.7" />
          <line x1="68" y1="46" x2="72" y2="50" stroke="#451A03" strokeWidth="0.7" />
        </g>
        <g>
          <path d="M22,72 Q28,68 34,72 L38,68 L38,76 L34,72 Q28,76 22,72 Z" fill="#FBBF24" />
          <circle cx="25" cy="72" r="0.8" fill="#0E7490" />
          <path d="M58,86 Q66,82 74,86 L80,82 L80,90 L74,86 Q66,90 58,86 Z" fill="#FBBF24" />
          <circle cx="62" cy="86" r="0.8" fill="#0E7490" />
          <path d="M28,100 Q36,96 44,100 L48,96 L48,104 L44,100 Q36,104 28,100 Z" fill="#FBBF24" />
          <circle cx="32" cy="100" r="0.8" fill="#0E7490" />
        </g>
        <path
          d="M12,55 Q22,52 28,55 Q36,58 44,55 Q52,52 60,55 Q68,58 76,55 Q82,52 88,55"
          fill="none"
          stroke="#164E63"
          strokeWidth="1.2"
        />
      </g>
      <path d={SHIELD} fill="none" stroke="#164E63" strokeWidth="2.5" />
      <path d={SHIELD_INNER} fill="none" stroke="#67E8F9" strokeWidth="0.8" opacity="0.5" />
      <MottoBanner text="ALEA IACTA EST" />
    </>
  ),

  // ─── 3. St Mary's C of E ────────────────────────────────────────
  3: (cid) => (
    <>
      <g>
        <path d="M38,14 Q40,8 44,5 Q47,2 50,2 Q53,2 56,5 Q60,8 62,14 Z" fill="white" stroke="#92400E" strokeWidth="0.7" />
        <path d="M38,13 Q50,15 62,13 L62,11 Q50,13 38,11 Z" fill="#D97706" />
        <line x1="50" y1="4" x2="50" y2="13" stroke="#D97706" strokeWidth="0.7" />
        <line x1="46" y1="8" x2="54" y2="8" stroke="#D97706" strokeWidth="0.6" />
        <line x1="50" y1="0" x2="50" y2="4" stroke="#D97706" strokeWidth="0.7" />
        <line x1="48" y1="2" x2="52" y2="2" stroke="#D97706" strokeWidth="0.7" />
        <path d="M42,14 L41.5,18 L43,18 Z" fill="white" stroke="#92400E" strokeWidth="0.4" />
        <path d="M58,14 L58.5,18 L57,18 Z" fill="white" stroke="#92400E" strokeWidth="0.4" />
        <line x1="42" y1="17" x2="43" y2="17" stroke="#D97706" strokeWidth="0.5" />
        <line x1="57" y1="17" x2="58" y2="17" stroke="#D97706" strokeWidth="0.5" />
      </g>
      <defs>
        <clipPath id={`${cid}-s`}><path d={SHIELD} /></clipPath>
      </defs>
      <path d={SHIELD} fill="#5B21B6" />
      <g clipPath={`url(#${cid}-s)`}>
        <path
          d="M44,18 L56,18 L56,58 L82,58 L82,70 L56,70 L56,114 L44,114 L44,70 L18,70 L18,58 L44,58 Z"
          fill="white"
        />
        <path
          d="M44,18 L56,18 L56,58 L82,58 L82,70 L56,70 L56,114 L44,114 L44,70 L18,70 L18,58 L44,58 Z"
          fill="none"
          stroke="#FBBF24"
          strokeWidth="0.8"
        />
        <g fill="#FBBF24">
          <ellipse cx="30" cy="36" rx="1.6" ry="6.5" />
          <ellipse cx="26.5" cy="37" rx="2.2" ry="5" transform="rotate(-28 26.5 37)" />
          <ellipse cx="33.5" cy="37" rx="2.2" ry="5" transform="rotate(28 33.5 37)" />
          <rect x="25" y="40" width="10" height="2.2" rx="1" />
          <ellipse cx="30" cy="30" rx="1.2" ry="2" fill="#F59E0B" />
          <ellipse cx="70" cy="36" rx="1.6" ry="6.5" />
          <ellipse cx="66.5" cy="37" rx="2.2" ry="5" transform="rotate(-28 66.5 37)" />
          <ellipse cx="73.5" cy="37" rx="2.2" ry="5" transform="rotate(28 73.5 37)" />
          <rect x="65" y="40" width="10" height="2.2" rx="1" />
          <ellipse cx="70" cy="30" rx="1.2" ry="2" fill="#F59E0B" />
          <ellipse cx="30" cy="88" rx="1.6" ry="6.5" />
          <ellipse cx="26.5" cy="89" rx="2.2" ry="5" transform="rotate(-28 26.5 89)" />
          <ellipse cx="33.5" cy="89" rx="2.2" ry="5" transform="rotate(28 33.5 89)" />
          <rect x="25" y="92" width="10" height="2.2" rx="1" />
          <ellipse cx="30" cy="82" rx="1.2" ry="2" fill="#F59E0B" />
          <ellipse cx="70" cy="88" rx="1.6" ry="6.5" />
          <ellipse cx="66.5" cy="89" rx="2.2" ry="5" transform="rotate(-28 66.5 89)" />
          <ellipse cx="73.5" cy="89" rx="2.2" ry="5" transform="rotate(28 73.5 89)" />
          <rect x="65" y="92" width="10" height="2.2" rx="1" />
          <ellipse cx="70" cy="82" rx="1.2" ry="2" fill="#F59E0B" />
        </g>
        <circle cx="50" cy="64" r="3.5" fill="#5B21B6" />
        <circle cx="50" cy="64" r="2" fill="#FBBF24" />
      </g>
      <path d={SHIELD} fill="none" stroke="#4C1D95" strokeWidth="2.5" />
      <path d={SHIELD_INNER} fill="none" stroke="#C4B5FD" strokeWidth="0.8" opacity="0.5" />
      <MottoBanner text="O TEMPORA O MORES" />
    </>
  ),

  // ─── 4. Oakwood Secondary School ────────────────────────────────
  4: (cid) => (
    <>
      <g>
        <path d="M40,12 Q40,3 50,3 Q60,3 60,12 Z" fill="#9CA3AF" stroke="#374151" strokeWidth="0.6" />
        <path d="M42,5 Q45,3.5 50,3.5 Q55,3.5 58,5" stroke="#E5E7EB" strokeWidth="0.6" fill="none" opacity="0.7" />
        <rect x="42" y="6" width="16" height="1.5" fill="#1F2937" />
        <rect x="42" y="9" width="16" height="1" fill="#1F2937" opacity="0.6" />
        <rect x="38" y="11.5" width="3" height="3.5" fill="#15803D" />
        <rect x="41" y="11.5" width="3" height="3.5" fill="#FBBF24" />
        <rect x="44" y="11.5" width="3" height="3.5" fill="#15803D" />
        <rect x="47" y="11.5" width="3" height="3.5" fill="#FBBF24" />
        <rect x="50" y="11.5" width="3" height="3.5" fill="#15803D" />
        <rect x="53" y="11.5" width="3" height="3.5" fill="#FBBF24" />
        <rect x="56" y="11.5" width="3" height="3.5" fill="#15803D" />
        <rect x="59" y="11.5" width="3" height="3.5" fill="#FBBF24" />
      </g>
      <defs>
        <clipPath id={`${cid}-s`}><path d={SHIELD} /></clipPath>
      </defs>
      <path d={SHIELD} fill="#FBBF24" />
      <g clipPath={`url(#${cid}-s)`}>
        <path d="M12,118 L12,68 L50,42 L88,68 L88,118 Z" fill="#065F46" />
        <g>
          <ellipse cx="26" cy="34" rx="3.2" ry="4" fill="#92400E" />
          <line x1="26" y1="32" x2="26" y2="36" stroke="#451A03" strokeWidth="0.3" />
          <path d="M22,32 Q26,29 30,32 Q30,35 26,35 Q22,35 22,32 Z" fill="#065F46" stroke="#064E3B" strokeWidth="0.4" />
          <rect x="25" y="25" width="2" height="3" fill="#065F46" />
          <ellipse cx="50" cy="28" rx="3.2" ry="4" fill="#92400E" />
          <line x1="50" y1="26" x2="50" y2="30" stroke="#451A03" strokeWidth="0.3" />
          <path d="M46,26 Q50,23 54,26 Q54,29 50,29 Q46,29 46,26 Z" fill="#065F46" stroke="#064E3B" strokeWidth="0.4" />
          <rect x="49" y="19" width="2" height="3" fill="#065F46" />
          <ellipse cx="74" cy="34" rx="3.2" ry="4" fill="#92400E" />
          <line x1="74" y1="32" x2="74" y2="36" stroke="#451A03" strokeWidth="0.3" />
          <path d="M70,32 Q74,29 78,32 Q78,35 74,35 Q70,35 70,32 Z" fill="#065F46" stroke="#064E3B" strokeWidth="0.4" />
          <rect x="73" y="25" width="2" height="3" fill="#065F46" />
        </g>
        <path d="M12,68 L50,42 L88,68" fill="none" stroke="#064E3B" strokeWidth="1.2" />
        <g>
          <path d="M47,86 L46,108 L54,108 L53,86 Z" fill="#451A03" />
          <path d="M44,108 Q47,105 50,108 Q53,105 56,108 L56,112 L44,112 Z" fill="#451A03" />
          <ellipse cx="50" cy="72" rx="22" ry="14" fill="#16A34A" />
          <ellipse cx="36" cy="78" rx="12" ry="10" fill="#16A34A" />
          <ellipse cx="64" cy="78" rx="12" ry="10" fill="#16A34A" />
          <ellipse cx="50" cy="66" rx="15" ry="11" fill="#22C55E" />
          <ellipse cx="42" cy="66" rx="2.5" ry="2" fill="#86EFAC" />
          <ellipse cx="58" cy="70" rx="2.5" ry="2" fill="#86EFAC" />
          <ellipse cx="48" cy="78" rx="2.5" ry="2" fill="#86EFAC" />
          <ellipse cx="62" cy="74" rx="2" ry="1.5" fill="#86EFAC" />
          <circle cx="38" cy="74" r="1.5" fill="#92400E" />
          <circle cx="62" cy="73" r="1.5" fill="#92400E" />
          <circle cx="52" cy="84" r="1.3" fill="#92400E" />
        </g>
      </g>
      <path d={SHIELD} fill="none" stroke="#064E3B" strokeWidth="2.5" />
      <path d={SHIELD_INNER} fill="none" stroke="#6EE7B7" strokeWidth="0.8" opacity="0.5" />
      <MottoBanner text="QUOUSQUE TANDEM" />
    </>
  ),

  // ─── 5. Thames Valley Running Club ──────────────────────────────
  5: (cid) => (
    <>
      <defs>
        <path id={`${cid}-top`} d="M 16,64 a 34,34 0 0,1 68,0" fill="none" />
        <path id={`${cid}-bot`} d="M 16,66 a 34,34 0 0,0 68,0" fill="none" />
      </defs>
      <circle cx="50" cy="64" r="42" fill="#EA580C" />
      <circle cx="50" cy="64" r="38" fill="#FFF7ED" />
      <circle cx="50" cy="64" r="36" fill="none" stroke="#EA580C" strokeWidth="0.5" opacity="0.5" />
      <text
        fontSize="6.2"
        fontWeight="800"
        fontFamily="Helvetica, Arial, sans-serif"
        fill="#EA580C"
        letterSpacing="1.6"
      >
        <textPath href={`#${cid}-top`} startOffset="50%" textAnchor="middle">THAMES VALLEY</textPath>
      </text>
      <text
        fontSize="5"
        fontWeight="700"
        fontFamily="Helvetica, Arial, sans-serif"
        fill="#1F2937"
        letterSpacing="3.5"
      >
        <textPath href={`#${cid}-bot`} startOffset="50%" textAnchor="middle">RUNNING CLUB</textPath>
      </text>
      <circle cx="18.5" cy="65" r="1" fill="#EA580C" />
      <circle cx="81.5" cy="65" r="1" fill="#EA580C" />
      <g stroke="#1F2937" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <circle cx="56" cy="54" r="3.5" fill="#1F2937" stroke="none" />
        <path d="M54,58 L47,70" strokeWidth="4.5" />
        <path d="M47,70 L55,76 L60,68" strokeWidth="4" />
        <path d="M47,70 L40,82" strokeWidth="4" />
        <path d="M54,61 L62,58" strokeWidth="3.5" />
        <path d="M51,64 L43,67" strokeWidth="3.5" />
      </g>
      <g stroke="#EA580C" strokeWidth="1" strokeLinecap="round" opacity="0.7">
        <line x1="32" y1="60" x2="38" y2="60" />
        <line x1="30" y1="65" x2="38" y2="65" />
        <line x1="32" y1="70" x2="38" y2="70" />
      </g>
      <rect x="40" y="120" width="20" height="8" rx="1" fill="#1F2937" />
      <text
        x="50"
        y="126"
        textAnchor="middle"
        fill="#FBBF24"
        fontSize="4.5"
        fontWeight="700"
        fontFamily="Helvetica, Arial, sans-serif"
        letterSpacing="1.5"
      >
        EST. 1985
      </text>
    </>
  ),

  // ─── 6. Hillside Business Group ─────────────────────────────────
  6: () => (
    <>
      <rect x="6" y="16" width="88" height="100" rx="4" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="0.6" />
      <g>
        <path d="M18,52 L30,34 L42,52 Z" fill="#94A3B8" />
        <path d="M30,52 L46,28 L62,52 Z" fill="#475569" />
        <path d="M46,52 L62,24 L78,52 Z" fill="#1E3A8A" />
        <circle cx="70" cy="30" r="3.5" fill="#F59E0B" />
        <line x1="14" y1="52" x2="86" y2="52" stroke="#CBD5E1" strokeWidth="0.6" />
      </g>
      <text
        x="50"
        y="74"
        textAnchor="middle"
        fill="#0F172A"
        fontSize="11"
        fontWeight="700"
        fontFamily="Helvetica, Arial, sans-serif"
        letterSpacing="1.4"
      >
        HILLSIDE
      </text>
      <text
        x="50"
        y="85"
        textAnchor="middle"
        fill="#64748B"
        fontSize="5.5"
        fontWeight="500"
        fontFamily="Helvetica, Arial, sans-serif"
        letterSpacing="4"
      >
        GROUP
      </text>
      <line x1="38" y1="92" x2="62" y2="92" stroke="#CBD5E1" strokeWidth="0.6" />
      <text
        x="50"
        y="102"
        textAnchor="middle"
        fill="#94A3B8"
        fontSize="3.6"
        fontWeight="400"
        fontFamily="Helvetica, Arial, sans-serif"
        letterSpacing="1"
      >
        STRATEGIC SOLUTIONS
      </text>
      <text
        x="50"
        y="108"
        textAnchor="middle"
        fill="#94A3B8"
        fontSize="3.6"
        fontWeight="400"
        fontFamily="Helvetica, Arial, sans-serif"
        letterSpacing="1"
      >
        FOR TOMORROW
      </text>
    </>
  ),
};

/**
 * Deterministic crest assignment: hash the org id (or any string key) into the
 * 1-6 range so the same org always shows the same crest across reloads.
 */
export function pickCrestId(key: string): 1 | 2 | 3 | 4 | 5 | 6 {
  let h = 0;
  for (let i = 0; i < key.length; i++) {
    h = ((h << 5) - h) + key.charCodeAt(i);
    h |= 0;
  }
  return (((Math.abs(h) % 6) + 1) as 1 | 2 | 3 | 4 | 5 | 6);
}

export function OrgCrest({
  orgKey,
  size = 40,
}: {
  orgKey: string;
  size?: number;
}) {
  const cid = useId().replace(/:/g, "");
  const crestId = pickCrestId(orgKey);
  const render = ORG_CRESTS[crestId];
  return (
    <svg
      width={size}
      height={size * 1.28}
      viewBox="0 0 100 128"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block", flexShrink: 0 }}
    >
      {render(cid)}
    </svg>
  );
}
