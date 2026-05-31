// Weave brandmark — a clean basket-weave of four strips (two vertical, two
// horizontal) with two lime accent caps. Sharp, balanced, modern.
export default function WeaveMark({ size = 28 }: { size?: number }) {
  const ink = "var(--text)";
  const lime = "var(--neon)";
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Weave">
      <rect x="18" y="6" width="6" height="36" rx="3" fill={ink} />
      <rect x="27" y="6" width="6" height="36" rx="3" fill={ink} />
      <rect x="6" y="18" width="36" height="6" rx="3" fill={ink} />
      <rect x="6" y="27" width="36" height="6" rx="3" fill={ink} />
      {/* lime accent caps — diagonal, for the standout weave thread */}
      <rect x="18" y="6" width="6" height="9" rx="3" fill={lime} />
      <rect x="27" y="33" width="6" height="9" rx="3" fill={lime} />
    </svg>
  );
}
