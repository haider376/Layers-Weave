"use client";

import { logoutAction } from "@/app/actions/session";
import NavPunk from "./NavPunk";

export default function SignOutButton() {
  return (
    <button className="itg-btn" title="Sign out" onClick={() => logoutAction()}>
      <NavPunk name="exit" size={19} />
    </button>
  );
}
