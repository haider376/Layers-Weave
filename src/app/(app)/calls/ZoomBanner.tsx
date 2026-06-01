"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { showToast } from "@/components/Toast";
import { disconnectZoomAction } from "@/app/actions/zoom";

type ZoomState = { connected: boolean; email: string | null; configured: boolean };

export default function ZoomBanner({ zoom }: { zoom: ZoomState }) {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const s = params.get("zoom");
    if (!s) return;
    const msg: Record<string, string> = {
      connected: "Zoom Phone connected ✓",
      denied: "Zoom connection cancelled",
      error: "Couldn't connect Zoom — try again",
      unconfigured: "Zoom isn't configured yet (admin setup needed)",
    };
    showToast(msg[s] ?? "Zoom");
    router.replace("/calls");
  }, [params, router]);

  async function disconnect() {
    await disconnectZoomAction();
    showToast("Zoom Phone disconnected");
    router.refresh();
  }

  return (
    <div className="zoom-banner">
      <div className="zoom-banner-l">
        <span className="itg-ic" style={{ background: "#2D8CFF", color: "#fff" }}>Z</span>
        <div>
          <div className="zoom-banner-t">Zoom Phone {zoom.connected && <span className="st go" style={{ marginLeft: 6 }}><span className="d" />Connected</span>}</div>
          <div className="zoom-banner-s">
            {zoom.connected ? `${zoom.email ?? "Connected"} · click-to-call from any contact + automatic call logging`
              : zoom.configured ? "Connect to enable click-to-call and automatic call logging into Coaching."
              : "Not configured yet — an admin needs to add Zoom API keys."}
          </div>
        </div>
      </div>
      {zoom.connected ? (
        <button className="itg-cta" style={{ borderColor: "var(--line-2)", color: "var(--muted)" }} onClick={disconnect}>Disconnect</button>
      ) : zoom.configured ? (
        <a className="itg-cta" href="/api/integrations/zoom/connect">Connect Zoom</a>
      ) : null}
    </div>
  );
}
