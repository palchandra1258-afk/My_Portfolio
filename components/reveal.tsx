"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Fires once on mount (not on scroll-into-view). A scroll-triggered
 * whileInView was tried first, but IntersectionObserver-based reveals are
 * unreliable across automated tools (full-page screenshots, print-to-PDF)
 * and some browser edge cases — a real risk on a recruiter-facing site
 * where content must never appear blank. Firing on mount guarantees every
 * section is visible within ~1s of navigation regardless of scroll state.
 */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const shouldReduceMotion = useReducedMotion();

  // `useReducedMotion()` returns null on first render (its matchMedia
  // subscription is only established in an effect, after mount), so this
  // branch can't be trusted to catch reduced-motion users before the
  // animated branch below has already painted at opacity 0. `[data-reveal]`
  // in globals.css is the real guarantee: it forces full visibility under
  // `prefers-reduced-motion: reduce` regardless of which branch rendered or
  // whether this check resolved in time.
  if (shouldReduceMotion) {
    return (
      <div data-reveal className={className}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      data-reveal
      className={className}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
