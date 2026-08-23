"use client";

import { useEffect } from "react";
import type { StatusTone } from "@/lib/api-types";

const TOAST_AUTO_DISMISS_MS = 10000;

type StatusBannerProps = {
  tone: StatusTone;
  message: string;
  links?: Array<{ label: string; href: string }>;
  onDismiss?: () => void;
};

export default function StatusBanner({
  tone,
  message,
  links,
  onDismiss,
}: StatusBannerProps) {
  useEffect(() => {
    if (!onDismiss) return;

    const timeoutId = window.setTimeout(() => {
      onDismiss();
    }, TOAST_AUTO_DISMISS_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [message, tone, links, onDismiss]);

  const toneClass =
    tone === "success"
      ? "status-success"
      : tone === "error"
        ? "status-error"
        : "status-info";

  return (
    <div className={`status-banner ${toneClass}`}>
      <div className="status-banner-row">
        <p>{message}</p>
        {onDismiss ? (
          <button
            type="button"
            className="status-dismiss"
            onClick={onDismiss}
            aria-label="Dismiss"
          >
            ✕
          </button>
        ) : null}
      </div>
      {links && links.length > 0 ? (
        <div className="status-links">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noreferrer"
            >
              {link.label}
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}
