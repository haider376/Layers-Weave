// Renders a real integration brand logo on a uniform tile so the multicolour
// marks read cleanly against the dark UI (consistent with our brand spec).
// `flush` is for logos that already carry their own filled background (e.g. Zoom).
const FLUSH = new Set(["zoom"]);

export default function BrandLogo({ name, label, className = "" }: { name: string; label?: string; className?: string }) {
  const flush = FLUSH.has(name) ? " flush" : "";
  return (
    <span className={`itg-logo${flush} ${className}`.trim()}>
      <img src={`/brand/logos/${name}.svg`} alt={label ?? name} />
    </span>
  );
}
