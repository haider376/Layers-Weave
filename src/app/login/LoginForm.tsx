"use client";

import { useActionState } from "react";
import Logo from "@/components/Logo";
import { loginAction, type LoginState } from "./actions";

export default function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, { error: "" });

  return (
    <div className="login">
      <div className="lcard">
        <div className="lg">
          <Logo />
        </div>
        <h2>Sign in</h2>
        <p className="wel">Wholesale CRM</p>
        <form action={action}>
          <div className="lfield">
            <label>Company email</label>
            <div className="inp">
              <input name="email" type="email" placeholder="you@layerswholesale.com" autoComplete="username" />
            </div>
          </div>
          <div className="lfield">
            <label>Password</label>
            <div className="inp">
              <input name="password" type="password" placeholder="••••••••" autoComplete="current-password" />
            </div>
          </div>
          <button className="lbtn" type="submit" disabled={pending}>
            {pending ? "Signing in…" : "Sign in"}
          </button>
          <div className="lerr">{state.error}</div>
        </form>
        <div className="lhint">
          Use your @layerswholesale.com address · demo password: <b>password</b>
        </div>
      </div>
    </div>
  );
}
