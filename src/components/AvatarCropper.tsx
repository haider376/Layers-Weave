"use client";

import { useEffect, useRef, useState } from "react";

// Self-contained avatar cropper: drag to position, zoom with slider/wheel,
// exports a square crop as a data URL. No external dependencies.
export default function AvatarCropper({
  src,
  onCancel,
  onSave,
}: {
  src: string;
  onCancel: () => void;
  onSave: (dataUrl: string) => void;
}) {
  const VIEW = 280; // crop viewport size (px)
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [minScale, setMinScale] = useState(1);
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setNatural({ w: img.naturalWidth, h: img.naturalHeight });
      const s = VIEW / Math.min(img.naturalWidth, img.naturalHeight);
      setMinScale(s);
      setZoom(s);
      setPos({ x: (VIEW - img.naturalWidth * s) / 2, y: (VIEW - img.naturalHeight * s) / 2 });
    };
    img.src = src;
  }, [src]);

  function clampPos(x: number, y: number, scale: number) {
    const w = natural.w * scale, h = natural.h * scale;
    return {
      x: Math.min(0, Math.max(VIEW - w, x)),
      y: Math.min(0, Math.max(VIEW - h, y)),
    };
  }

  function onZoom(z: number) {
    const c = VIEW / 2;
    const ratio = z / zoom;
    const nx = c - (c - pos.x) * ratio;
    const ny = c - (c - pos.y) * ratio;
    setZoom(z);
    setPos(clampPos(nx, ny, z));
  }

  function onPointerDown(e: React.PointerEvent) {
    drag.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current) return;
    const nx = drag.current.px + (e.clientX - drag.current.x);
    const ny = drag.current.py + (e.clientY - drag.current.y);
    setPos(clampPos(nx, ny, zoom));
  }
  function onPointerUp() { drag.current = null; }

  function save() {
    const img = imgRef.current;
    if (!img) return;
    const out = 320;
    const canvas = document.createElement("canvas");
    canvas.width = out; canvas.height = out;
    const ctx = canvas.getContext("2d")!;
    // Map viewport → source pixels
    const sx = -pos.x / zoom, sy = -pos.y / zoom, sSize = VIEW / zoom;
    ctx.drawImage(img, sx, sy, sSize, sSize, 0, 0, out, out);
    onSave(canvas.toDataURL("image/jpeg", 0.9));
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
          onWheel={(e) => onZoom(Math.max(minScale, Math.min(minScale * 5, zoom * (e.deltaY < 0 ? 1.06 : 0.94))))}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt="crop"
            draggable={false}
            style={{ position: "absolute", left: pos.x, top: pos.y, width: natural.w * zoom, height: natural.h * zoom, maxWidth: "none", userSelect: "none" }}
          />
          <div className="cropper-ring" />
        </div>
        <div className="cropper-zoom">
          <span>−</span>
          <input type="range" min={minScale} max={minScale * 5} step="0.01" value={zoom} onChange={(e) => onZoom(Number(e.target.value))} />
          <span>+</span>
        </div>
        <div className="cropper-actions">
          <button className="btn ghost" onClick={onCancel}>Cancel</button>
          <button className="btn primary" onClick={save}>Save photo</button>
        </div>
      </div>
    </div>
  );
}
