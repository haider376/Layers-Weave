"use client";

type ZoomState = { connected: boolean; email: string | null; configured: boolean };

// Account-level (Server-to-Server) Zoom: there's no per-user connect — the
// whole team is wired via account credentials. This just reflects status.
export default function ZoomBanner({ zoom }: { zoom: ZoomState }) {
  return (
    <div className="zoom-banner">
      <div className="zoom-banner-l">
        <span className="itg-ic" style={{ background: "#2D8CFF", color: "#fff" }}>Z</span>
        <div>
          <div className="zoom-banner-t">
            Zoom Phone {zoom.connected
              ? <span className="st go" style={{ marginLeft: 6 }}><span className="d" />Active</span>
              : <span className="st bad" style={{ marginLeft: 6 }}><span className="d" />Not configured</span>}
          </div>
          <div className="zoom-banner-s">
            {zoom.connected
              ? "Account-level connection active · click-to-call from any contact + automatic call logging."
              : "Admin needs to add Zoom Server-to-Server credentials (account ID + keys) in the environment."}
          </div>
        </div>
      </div>
    </div>
  );
}
