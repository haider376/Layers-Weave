// Punk brand marks (lime-green, hand-drawn, dripping). Rendered from the SVGs
// in /public/brand. Use `anim` to give it life: "float" | "pop" | "wobble".
export type PunkName =
  | "globe" | "star" | "smiley" | "bolt" | "arrow" | "flame" | "heart" | "crown"
  | "target" | "hanger" | "phone" | "trophy" | "dollar" | "fist" | "eye" | "clock"
  | "scissors" | "rocket" | "tag" | "chat" | "pin" | "diamond" | "skull" | "headset"
  | "search" | "bell" | "gear" | "mail" | "exit" | "plus" | "close" | "filter"
  | "note" | "calendar" | "check";

export const PUNK_NAMES: PunkName[] = [
  "globe", "star", "smiley", "bolt", "arrow", "flame", "heart", "crown",
  "target", "hanger", "phone", "trophy", "dollar", "fist", "eye", "clock",
  "scissors", "rocket", "tag", "chat", "pin", "diamond", "skull", "headset",
  "search", "bell", "gear", "mail", "exit", "plus", "close", "filter",
  "note", "calendar", "check",
];

export default function PunkMark({
  name, size = 48, anim, className = "", style,
}: {
  name: PunkName;
  size?: number;
  anim?: "float" | "pop" | "wobble" | "spin";
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/brand/${name}.svg`}
      alt={name}
      width={size}
      height={size}
      className={`punk${anim ? ` punk-${anim}` : ""} ${className}`}
      style={style}
      draggable={false}
    />
  );
}
