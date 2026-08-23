"use client";

import { useMemo } from "react";
import type { ImageListItem } from "@/lib/api-types";

type Bucket = {
  label: string;
  range: string;
  color: string;
  count: number;
};

const BUCKETS: Omit<Bucket, "count">[] = [
  { label: "< 5K", range: "< 3.1 mi", color: "#e88ac4" },
  { label: "5K – 10K", range: "3.1 – 6.2 mi", color: "#e8a631" },
  { label: "10K – Half", range: "6.2 – 13.1 mi", color: "#3b55ff" },
  { label: "Half – Full", range: "13.1 – 26.2 mi", color: "#9c2abc" },
  { label: "Marathon+", range: "≥ 26.2 mi", color: "#29e483" },
];

function getDistanceBucketIndex(distanceMiles: number | null): number {
  if (distanceMiles == null) return 0;
  if (distanceMiles >= 26.2) return 4;
  if (distanceMiles >= 13.1) return 3;
  if (distanceMiles >= 6.2) return 2;
  if (distanceMiles >= 3.1) return 1;
  return 0;
}

function formatSeconds(value: number | null): string {
  if (!Number.isFinite(value) || value == null) return "-";

  const total = Math.max(0, Math.round(value));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

type RunSummaryProps = {
  images: ImageListItem[];
  activeYear: YearTab;
  activeMonth: MonthTab;
  onYearChange: (year: YearTab) => void;
  onMonthChange: (month: MonthTab) => void;
};

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

type YearTab = "ALL" | number;
type MonthTab = "ALL" | number;

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

export default function RunSummary({
  images,
  activeYear,
  activeMonth,
  onYearChange,
  onMonthChange,
}: RunSummaryProps) {
  const yearTabs = useMemo(() => {
    const years = new Set<number>();
    for (const image of images) {
      const parts = getDatePartsFromFilename(image.filename);
      if (parts) {
        years.add(parts.year);
      }
    }

    return ["ALL", ...Array.from(years).sort((a, b) => b - a)] as YearTab[];
  }, [images]);

  const yearCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: images.length };

    for (const image of images) {
      const parts = getDatePartsFromFilename(image.filename);
      if (parts) {
        const key = String(parts.year);
        counts[key] = (counts[key] || 0) + 1;
      }
    }

    return counts;
  }, [images]);

  const monthCounts = useMemo(() => {
    const counts = Array.from({ length: 13 }, () => 0);
    if (activeYear === "ALL") return counts;

    for (const image of images) {
      const parts = getDatePartsFromFilename(image.filename);
      if (!parts || parts.year !== activeYear) continue;

      counts[0] += 1;
      counts[parts.month] += 1;
    }

    return counts;
  }, [activeYear, images]);

  const filteredImages = useMemo(() => {
    if (activeYear === "ALL") return images;

    if (activeMonth === "ALL") {
      return images.filter((image) => {
        const parts = getDatePartsFromFilename(image.filename);
        return parts?.year === activeYear;
      });
    }

    return images.filter((image) => {
      const parts = getDatePartsFromFilename(image.filename);
      return parts?.year === activeYear && parts?.month === activeMonth;
    });
  }, [activeMonth, activeYear, images]);

  if (images.length === 0) return null;

  const counts = [0, 0, 0, 0, 0];
  for (const { metadata } of filteredImages) {
    const miles =
      metadata?.titleLabel != null ? parseFloat(metadata.titleLabel) : null;
    counts[getDistanceBucketIndex(isNaN(miles!) ? null : miles)]++;
  }

  const buckets: Bucket[] = BUCKETS.map((b, i) => ({ ...b, count: counts[i] }));
  const total = filteredImages.length;

  const metricRows = filteredImages
    .map((image) => image.metadata?.metrics)
    .filter(
      (metrics): metrics is NonNullable<ImageListItem["metadata"]>["metrics"] =>
        Boolean(metrics),
    );

  const availableMetricActivities = metricRows.length;
  const avgHeartRates = metricRows
    .map((metrics) => metrics?.avgHeartRate)
    .filter((value): value is number => Number.isFinite(value));
  const maxHeartRates = metricRows
    .map((metrics) => metrics?.maxHeartRate)
    .filter((value): value is number => Number.isFinite(value));
  const bestMileSeconds = metricRows
    .map((metrics) => metrics?.bestMileSeconds)
    .filter((value): value is number => Number.isFinite(value));

  const scopedAverageHeartRate =
    avgHeartRates.length > 0
      ? Math.round(
          avgHeartRates.reduce((sum, value) => sum + value, 0) /
            avgHeartRates.length,
        )
      : null;
  const scopedMaxHeartRate =
    maxHeartRates.length > 0 ? Math.max(...maxHeartRates) : null;
  const scopedBestMileSeconds =
    bestMileSeconds.length > 0 ? Math.min(...bestMileSeconds) : null;

  const scopeLabel =
    activeYear === "ALL"
      ? "All years"
      : activeMonth === "ALL"
        ? `All months in ${activeYear}`
        : `${MONTHS[activeMonth - 1]} ${activeYear}`;

  return (
    <section
      className="run-summary-section"
      aria-label="Run summary by distance, year, and month"
    >
      <div className="run-summary-filter-chips">
        <div className="run-summary-year-chips">
          {yearTabs.map((yearTab) => {
            const isSelected = yearTab === activeYear;
            const yearKey = String(yearTab);
            const count = yearCounts[yearKey] || 0;

            return (
              <button
                key={yearKey}
                type="button"
                className={`run-summary-chip ${isSelected ? "active" : ""}`}
                onClick={() => onYearChange(yearTab)}
              >
                {yearTab} <span className="chip-count">({count})</span>
              </button>
            );
          })}
        </div>

        {activeYear !== "ALL" && (
          <div className="run-summary-month-chips">
            {MONTHS.map((monthName, index) => ({
              monthName,
              month: index + 1,
            })).map(({ monthName, month }) => {
              const isMonthSelected = activeMonth === month;
              const monthCount = monthCounts[month] || 0;

              return (
                <button
                  key={`${activeYear}-${monthName}`}
                  type="button"
                  className={`run-summary-chip month-chip ${isMonthSelected ? "active" : ""}`}
                  onClick={() => onMonthChange(month)}
                >
                  {monthName} <span className="chip-count">({monthCount})</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <p className="run-summary-scope">
        Scope: <strong>{scopeLabel}</strong> ({total} run
        {total === 1 ? "" : "s"})
      </p>

      <div className="run-summary-metrics" aria-label="FIT metrics summary">
        <span className="run-summary-metric-chip">
          FIT metrics: <strong>{availableMetricActivities}</strong>/{total}
        </span>
        <span className="run-summary-metric-chip">
          Avg HR: <strong>{scopedAverageHeartRate ?? "-"}</strong>
        </span>
        <span className="run-summary-metric-chip">
          Max HR: <strong>{scopedMaxHeartRate ?? "-"}</strong>
        </span>
        <span className="run-summary-metric-chip">
          Best mile: <strong>{formatSeconds(scopedBestMileSeconds)}</strong>
        </span>
      </div>

      <div className="run-summary">
        <div className="run-summary-bar-container">
          <div className="run-summary-bar-wrapper">
            {buckets.map(({ label, color, count }) => (
              <div
                key={label}
                className="run-summary-bar-segment"
                style={{
                  flex: count,
                  background: color,
                  minWidth: count > 0 ? "2px" : "0",
                }}
                title={`${label}: ${count}`}
              />
            ))}
          </div>
        </div>

        <div className="run-summary-legend">
          {buckets.map(({ label, range, color, count }) => {
            const percentValue =
              total > 0 ? Math.round((count / total) * 100) : 0;

            return (
              <div key={label} className="run-summary-legend-item">
                <span
                  className="run-summary-legend-dot"
                  style={{ background: color }}
                />
                <span className="run-summary-legend-label">{label}</span>
                <span className="run-summary-legend-range">{range}</span>
                <span className="run-summary-legend-count">
                  {count} ({percentValue}%)
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
