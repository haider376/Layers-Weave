"use client";

import { useEffect, useState } from "react";

export function showToast(message: string) {
  window.dispatchEvent(new CustomEvent("lw-toast", { detail: message }));
}

export default function Toaster() {
  const [msg, setMsg] = useState("");
  const [show, setShow] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    function onToast(e: Event) {
      setMsg((e as CustomEvent<string>).detail);
      setShow(true);
      clearTimeout(timer);
      timer = setTimeout(() => setShow(false), 2400);
    }
    window.addEventListener("lw-toast", onToast);
    return () => {
      window.removeEventListener("lw-toast", onToast);
      clearTimeout(timer);
    };
  }, []);

  return <div className={`toast${show ? " show" : ""}`}>{msg}</div>;
}
