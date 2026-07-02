"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import PunkMark from "@/components/PunkMark";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setPending(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        router.push("/dashboard");
        router.refresh();
        return;
      }
      setError(data.error || "Sign-in failed.");
    } catch {
      setError("Network error — please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="login">
      <div className="lcard">
        <span className="lcard-mark"><PunkMark name="globe" size={52} anim="float" /></span>
        <div className="lg lg-row">
          <Logo />
        </div>
        <h2>Sign in</h2>
        <p className="wel">Layers Weave</p>
        <form onSubmit={submit}>
          <div className="lfield">
            <label>Company email</label>
            <div className="inp">
              <input
                name="email"
                type="email"
                placeholder="you@layerswholesale.co"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
          <div className="lfield">
            <label>Password</label>
            <div className="inp">
              <input
                name="password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>
          <button className="lbtn" type="submit" disabled={pending}>
            {pending ? "Signing in…" : "Sign in"}
          </button>
          <div className="lerr">{error}</div>
        </form>
        <div className="lhint">
          Use your @layerswholesale.co address · demo password: <b>password</b>
        </div>
      </div>
    </div>
  );
}
