// Empty-state art — a hand-drawn scribble arrow over a short message, in the
// brand's punk/graffiti style. Use anywhere a list/timeline has no rows yet.
export default function EmptyState({ text, sub }: { text: string; sub?: string }) {
  return (
    <div className="empty-st">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="empty-art" src="/brand/arrow-down.svg" alt="" aria-hidden="true" />
      <div className="empty-t">{text}</div>
      {sub && <div className="empty-s">{sub}</div>}
    </div>
  );
}
