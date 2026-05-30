"use client";

import { useRef, useState } from "react";

const VIEW = 288; // crop viewport (px)

export default function AvatarCropper({
  src, onCancel, onSave,
}: {
  src: string;
  onCancel: () => void;
  onSave: (dataUrl: string) => void;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
  const [minScale, setMinScale] = useState(1);
  const [scale, setScale] = useState(1);
  const [t, setT] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);

  function clamp(x: number, y: number, s: number, w: number, h: number) {
    return { x: Math.min(0, Math.max(VIEW - w * s, x)), y: Math.min(0, Math.max(VIEW - h * s, y)) };
  }

  function onLoad() {
    const el = imgRef.current;
    if (!el) return;
    const w = el.naturalWidth, h = el.naturalHeight;
    const m = VIEW / Math.min(w, h);
    setDims({ w, h });
    setMinScale(m);
    setScale(m);
    setT({ x: (VIEW - w * m) / 2, y: (VIEW - h * m) / 2 });
  }

  function zoomTo(next: number) {
    if (!dims) return;
    const s = Math.max(minScale, Math.min(minScale * 6, next));
    const c = VIEW / 2;
    const ratio = s / scale;
    const nx = c - (c - t.x) * ratio;
    const ny = c - (c - t.y) * ratio;
    setScale(s);
    setT(clamp(nx, ny, s, dims.w, dims.h));
  }

  function onPointerDown(e: React.PointerEvent) {
    drag.current = { x: e.clientX, y: e.clientY, tx: t.x, ty: t.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current || !dims) return;
    const nx = drag.current.tx + (e.clientX - drag.current.x);
    const ny = drag.current.ty + (e.clientY - drag.current.y);
    setT(clamp(nx, ny, scale, dims.w, dims.h));
  }
  function onPointerUp() { drag.current = null; }

  function save() {
    const el = imgRef.current;
    if (!el || !dims) return;
    const out = 320;
    const canvas = document.createElement("canvas");
    canvas.width = out; canvas.height = out;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(el, -t.x / scale, -t.y / scale, VIEW / scale, VIEW / scale, 0, 0, out, out);
    onSave(canvas.toDataURL("image/jpeg", 0.92));
  }

  return (
    <div className="cropper-overlay" onClick={onCancel}>
      <div className="cropper" onClick={(e) => e.stopPropagation()}>
        <div className="cropper-h">Adjust your photo</div>
        <div
          className="cropper-stage"
          style={{ width: VIEW, height: VIEW }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onWheel={(e) => zoomTo(scale * (e.deltaY < 0 ? 1.08 : 0.92))}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={src}
            alt="crop"
            draggable={false}
            onLoad={onLoad}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: dims ? dims.w : "auto",
              height: dims ? dims.h : "auto",
              maxWidth: "none",
              transform: `translate(${t.x}px, ${t.y}px) scale(${scale})`,
              transformOrigin: "0 0",
              opacity: dims ? 1 : 0,
              userSelect: "none",
              willChange: "transform",
            }}
          />
          <div className="cropper-ring" />
        </div>
        <div className="cropper-zoom">
          <span>−</span>
          <input type="range" min={minScale} max={minScale * 6} step="0.001" value={scale} onChange={(e) => zoomTo(Number(e.target.value))} />
          <span>+</span>
        </div>
        <div className="cropper-actions">
          <button className="btn ghost" onClick={onCancel}>Cancel</button>
          <button className="btn primary" onClick={save} disabled={!dims}>Save photo</button>
        </div>
      </div>
    </div>
  );
}
