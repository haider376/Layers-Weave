// The Weave brandmark — interlocking woven strips forming a plus/cross weave.
// Ivory strips with a single lime strip as the brand accent (per brand spec).
export default function WeaveMark({ size = 26 }: { size?: number }) {
  const ink = "var(--text)";
  const lime = "var(--neon)";
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Weave">
      {/* vertical strips */}
      <rect x="26" y="6" width="8" height="34" rx="2.5" fill={ink} />
      <rect x="38" y="14" width="6" height="30" rx="2.5" fill={ink} />
      {/* horizontal strips */}
      <rect x="14" y="26" width="34" height="8" rx="2.5" fill={ink} />
      <rect x="20" y="38" width="30" height="6" rx="2.5" fill={ink} />
      {/* short accent strips — the lime weave */}
      <rect x="18" y="20" width="8" height="6" rx="2" fill={lime} />
      <rect x="34" y="44" width="6" height="8" rx="2" fill={lime} />
    </svg>
  );
}
