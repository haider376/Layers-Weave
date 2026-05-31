import type { PunkName } from "./PunkMark";

// A nav-sized punk icon that inherits the link's text color via CSS mask
// (so it goes muted → lime when active, just like the old line icons) while
// keeping the hand-drawn graffiti silhouette.
export default function NavPunk({ name, size = 18 }: { name: PunkName; size?: number }) {
  return (
    <span
      className="navpunk"
      style={{
        width: size,
        height: size,
        WebkitMaskImage: `url(/brand/${name}.svg)`,
        maskImage: `url(/brand/${name}.svg)`,
      }}
    />
  );
}
