import type { StatusTone } from "@/lib/api-types";

type StatusBannerProps = {
  tone: StatusTone;
  message: string;
  links?: Array<{ label: string; href: string }>;
};

export default function StatusBanner({
  tone,
  message,
  links,
}: StatusBannerProps) {
  const toneClass =
    tone === "success"
      ? "status-success"
      : tone === "error"
        ? "status-error"
        : "status-info";

  return (
    <div className={`status-banner ${toneClass}`}>
      <p>{message}</p>
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
