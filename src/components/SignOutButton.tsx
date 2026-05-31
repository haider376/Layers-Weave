"use client";

import { logoutAction } from "@/app/actions/session";

export default function SignOutButton() {
  return (
    <button className="itg-btn" title="Sign out" onClick={() => logoutAction()}>
      <svg fill="none" strokeWidth={2} viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></svg>
    </button>
  );
}
