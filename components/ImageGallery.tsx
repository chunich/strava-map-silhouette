"use client";

import { useLayoutEffect, useRef } from "react";
import type { ImageListItem } from "@/lib/api-types";

type ImageGalleryProps = {
  images: ImageListItem[];
  activeYear: "ALL" | number;
  activeMonth: "ALL" | number;
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

function getDatePartsFromFilename(
  filename: string,
): { year: number; month: number } | null {
  const match = filename.match(/^(\d{4})-(\d{2})-(\d{2})_/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isInteger(year) || month < 1 || month > 12) return null;

  return { year, month };
}

export default function ImageGallery({
  images,
  activeYear,
  activeMonth,
  hideFilenames,
  showImageOverlay,
  imageColumns,
  isLoading = false,
  error = null,
}: ImageGalleryProps) {
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const prevRects = useRef<Map<string, DOMRect>>(new Map());
  const hoveredCategoryRef = useRef<number | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // Filter images based on selected year/month
  const filteredImages = images.filter((image) => {
    if (activeYear === "ALL") return true;

    const parts = getDatePartsFromFilename(image.filename);
    if (!parts) return false;

    if (activeMonth === "ALL") {
      return parts.year === activeYear;
    }

    return parts.year === activeYear && parts.month === activeMonth;
  });

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
  }, [filteredImages, imageColumns, hideFilenames, showImageOverlay]);

  if (isLoading) {
    return <p className="empty-state loading-pulse">Loading images...</p>;
  }

  if (error) {
    return <p className="empty-state section-error">{error}</p>;
  }

  if (filteredImages.length === 0) {
    return (
      <p className="empty-state">
        No images generated yet. Use GPX/TCX/FIT or Strava to generate.
      </p>
    );
  }

  return (
    <div
      ref={gridRef}
      className="image-grid"
      style={{
        gridTemplateColumns: `repeat(${imageColumns}, minmax(0, 1fr))`,
      }}
    >
      {filteredImages.map(({ filename, metadata }) => {
        const category = getDistanceCategory(metadata);

        return (
          <div
            key={filename}
            data-category={category}
            ref={(element) => {
              if (element) {
                cardRefs.current.set(filename, element);
              } else {
                cardRefs.current.delete(filename);
              }
            }}
            className="image-card"
            onMouseEnter={() => {
              hoveredCategoryRef.current = category;
              updateCardStyles();
            }}
            onMouseLeave={() => {
              hoveredCategoryRef.current = null;
              updateCardStyles();
            }}
          >
            <a
              className="image-thumb"
              href={`/api/images/${encodeURIComponent(filename)}`}
              target="_blank"
              rel="noreferrer"
              aria-label={`Open ${filename}`}
              onFocus={() => {
                hoveredCategoryRef.current = category;
                updateCardStyles();
              }}
              onBlur={() => {
                hoveredCategoryRef.current = null;
                updateCardStyles();
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

  function updateCardStyles() {
    const hovered = hoveredCategoryRef.current;
    if (!gridRef.current) return;

    const cards = gridRef.current.querySelectorAll(".image-card");
    cards.forEach((card) => {
      const dataCategory = card.getAttribute("data-category");
      const category = dataCategory ? Number.parseInt(dataCategory, 10) : null;

      card.classList.toggle(
        "is-category-match",
        hovered !== null && category === hovered,
      );
      card.classList.toggle("is-dim", hovered !== null && category !== hovered);
    });
  }
}
