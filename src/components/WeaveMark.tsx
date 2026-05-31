// The Weave brandmark — two vertical + two horizontal strips interlocking in a
// basket weave (a woven plus). Ivory strips with a single lime strip as the
// brand accent, per spec. Rounded ends, generous spacing — matches the source mark.
export default function WeaveMark({ size = 28 }: { size?: number }) {
  const ink = "var(--text)";
  const lime = "var(--neon)";
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Weave">
      {/* two vertical strips (offset heights for the woven look) */}
      <rect x="25.5" y="8" width="9" height="40" rx="3" fill={ink} />
      <rect x="37" y="16" width="7" height="40" rx="3" fill={ink} />
      {/* two horizontal strips */}
      <rect x="8" y="29.5" width="40" height="9" rx="3" fill={ink} />
      <rect x="16" y="41" width="40" height="7" rx="3" fill={ink} />
      {/* lime accent strips — the standout weave threads */}
      <rect x="16" y="20" width="9" height="9" rx="3" fill={lime} />
      <rect x="44" y="38" width="7" height="9" rx="3" fill={lime} />
    </svg>
  );
}
