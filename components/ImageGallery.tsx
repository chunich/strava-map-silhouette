"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { ImageListItem } from "@/lib/api-types";

type ImageGalleryProps = {
  images: ImageListItem[];
  hideFilenames: boolean;
  showImageOverlay: boolean;
  imageColumns: number;
  isLoading?: boolean;
  error?: string | null;
};

function getDistanceCategory(metadata?: {
  titleLabel?: string;
}): number | null {
  const distanceMiles = metadata?.titleLabel
    ? Number.parseFloat(metadata.titleLabel)
    : Number.NaN;

  if (Number.isNaN(distanceMiles)) return null;
  if (distanceMiles >= 26.2) return 4;
  if (distanceMiles >= 13.1) return 3;
  if (distanceMiles >= 6.2) return 2;
  if (distanceMiles >= 3.1) return 1;
  return 0;
}

export default function ImageGallery({
  images,
  hideFilenames,
  showImageOverlay,
  imageColumns,
  isLoading = false,
  error = null,
}: ImageGalleryProps) {
  const [hoveredCategory, setHoveredCategory] = useState<number | null>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const prevRects = useRef<Map<string, DOMRect>>(new Map());

  useLayoutEffect(() => {
    const nextRects = new Map<string, DOMRect>();
    for (const [filename, element] of cardRefs.current) {
      nextRects.set(filename, element.getBoundingClientRect());
    }

    // Animate from previous layout position to current (FLIP)
    for (const [filename, element] of cardRefs.current) {
      const previous = prevRects.current.get(filename);
      const next = nextRects.get(filename);
      if (!previous || !next) continue;

      const deltaX = previous.left - next.left;
      const deltaY = previous.top - next.top;

      if (Math.abs(deltaX) < 0.5 && Math.abs(deltaY) < 0.5) continue;

      element.animate(
        [
          { transform: `translate(${deltaX}px, ${deltaY}px)` },
          { transform: "translate(0, 0)" },
        ],
        {
          duration: 220,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        },
      );
    }

    prevRects.current = nextRects;
  }, [images, imageColumns, hideFilenames, showImageOverlay]);

  if (isLoading) {
    return <p className="empty-state loading-pulse">Loading images...</p>;
  }

  if (error) {
    return <p className="empty-state section-error">{error}</p>;
  }

  if (images.length === 0) {
    return (
      <p className="empty-state">
        No images generated yet. Use GPX/TCX or Strava to generate.
      </p>
    );
  }

  return (
    <div
      className="image-grid"
      style={{
        gridTemplateColumns: `repeat(${imageColumns}, minmax(0, 1fr))`,
      }}
    >
      {images.map(({ filename, metadata }) => {
        const category = getDistanceCategory(metadata);
        const isCategoryMatch =
          hoveredCategory !== null && category === hoveredCategory;
        const isDimmed =
          hoveredCategory !== null && category !== hoveredCategory;

        return (
          <div
            key={filename}
            ref={(element) => {
              if (element) {
                cardRefs.current.set(filename, element);
              } else {
                cardRefs.current.delete(filename);
              }
            }}
            className={`image-card ${isCategoryMatch ? "is-category-match" : ""} ${isDimmed ? "is-dim" : ""}`}
            onMouseEnter={() => {
              setHoveredCategory(category);
            }}
            onMouseLeave={() => {
              setHoveredCategory(null);
            }}
          >
            <a
              className="image-thumb"
              href={`/api/images/${encodeURIComponent(filename)}`}
              target="_blank"
              rel="noreferrer"
              aria-label={`Open ${filename}`}
              onFocus={() => {
                setHoveredCategory(category);
              }}
              onBlur={() => {
                setHoveredCategory(null);
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/images/${encodeURIComponent(filename)}`}
                alt={filename}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.opacity = "0.3";
                  (e.currentTarget as HTMLImageElement).alt =
                    `Failed to load: ${filename}`;
                }}
              />
              {showImageOverlay && metadata?.titleLabel && (
                <div className="image-overlay-title">{metadata.titleLabel}</div>
              )}
            </a>
            {!hideFilenames ? (
              <div className="filename" title={filename}>
                {filename}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
