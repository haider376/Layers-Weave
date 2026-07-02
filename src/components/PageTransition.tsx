"use client";

import { motion } from "framer-motion";
import { usePathname } from "next/navigation";

// Spatial route transition — each page rises into place with a hint of depth
// (fade + rise + scale), like surfacing a pane. Skipped under reduced motion.
export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const still = typeof document !== "undefined" && document.documentElement.classList.contains("reduce-motion");
  if (still) return <div key={pathname}>{children}</div>;
  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: 16, scale: 0.988 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
      style={{ transformOrigin: "50% 20%" }}
    >
      {children}
    </motion.div>
  );
}
