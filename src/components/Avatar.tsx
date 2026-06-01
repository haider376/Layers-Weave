import { initials } from "./Logo";

// Shows a user's uploaded profile photo when available, otherwise their
// initials. `className` keeps the existing avatar sizing (mini-av, lb-av, etc.).
export default function Avatar({
  name, avatarUrl, className = "mini-av", style,
}: {
  name: string;
  avatarUrl?: string | null;
  className?: string;
  style?: React.CSSProperties;
}) {
  if (avatarUrl) {
    return (
      <span
        className={className}
        style={{ backgroundImage: `url(${avatarUrl})`, backgroundSize: "cover", backgroundPosition: "center", ...style }}
        aria-label={name}
      />
    );
  }
  return <span className={className} style={style}>{initials(name)}</span>;
}
