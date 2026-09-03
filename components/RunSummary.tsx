"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import type { ImageListItem } from "@/lib/api-types";

type DistanceBucketDef = {
  label: string;
  range: string;
  color: string;
};

const DISTANCE_BUCKETS: DistanceBucketDef[] = [
  { label: "< 5K", range: "< 3.1 mi", color: "#e88ac4" },
  { label: "5K - 10K", range: "3.1 - 6.2 mi", color: "#e8a631" },
  { label: "10K - Half", range: "6.2 - 13.1 mi", color: "#3b55ff" },
  { label: "Half - Full", range: "13.1 - 26.2 mi", color: "#9c2abc" },
  { label: "Marathon+", range: ">= 26.2 mi", color: "#29e483" },
];

function getDistanceBucketIndex(distanceMiles: number | null): number | null {
  if (distanceMiles == null) return null;
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
    return `${hours}:${String(minutes).padStart(2, "0")}'${String(seconds).padStart(2, "0")}"`;
  }

  return `${minutes}'${String(seconds).padStart(2, "0")}"`;
}

function formatMiles(value: number | null): string {
  if (!Number.isFinite(value) || value == null) return "-";
  return `${value.toFixed(2)} mi`;
}

function formatPace(value: number | null): string {
  if (!Number.isFinite(value) || value == null || value <= 0) return "-";

  const rounded = Math.max(0, Math.round(value));
  const minutes = Math.floor(rounded / 60);
  const seconds = rounded % 60;

  return `${minutes}'${String(seconds).padStart(2, "0")}"/mi`;
}

function formatHeartRate(avg: number | null, max: number | null): string {
  if (!Number.isFinite(avg) && !Number.isFinite(max)) return "-";

  const avgLabel = Number.isFinite(avg) ? Math.round(avg as number) : "-";
  const maxLabel = Number.isFinite(max) ? Math.round(max as number) : "-";
  return `${avgLabel}/${maxLabel}`;
}

function formatCalendarDate(
  year: number | null,
  month: number | null,
  day: number | null,
): string {
  if (
    year == null ||
    month == null ||
    day == null ||
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return "-";
  }

  const monthLabels = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sept",
    "Oct",
    "Nov",
    "Dec",
  ];
  const label = monthLabels[month - 1];
  if (!label) return "-";

  return `${label} ${day}, ${year}`;
}

function parseMiles(image: ImageListItem): number | null {
  const raw = image.metadata?.titleLabel;
  if (raw == null) return null;

  const parsed = parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function isSameValue(a: number | null, b: number | null): boolean {
  if (a == null || b == null) return false;
  return Math.abs(a - b) < 1e-9;
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
type SummaryAccordion = "best" | "list" | null;

type RunPoint = {
  filename: string;
  distanceMiles: number | null;
  activitySeconds: number | null;
  paceSeconds: number | null;
};

type BadgeRunPoint = {
  year: number | null;
  distanceMiles: number | null;
  paceSeconds: number | null;
};

type BestEffortSeconds = {
  best1MileSeconds: number | null;
  best5KSeconds: number | null;
  best10KSeconds: number | null;
  best10MileSeconds: number | null;
  best20KSeconds: number | null;
  bestHalfSeconds: number | null;
  best25KSeconds: number | null;
  best30KSeconds: number | null;
  best35KSeconds: number | null;
  best40KSeconds: number | null;
  bestMarathonSeconds: number | null;
};

type RunListRow = {
  filename: string;
  year: number | null;
  month: number | null;
  day: number | null;
  distanceMiles: number | null;
  activityPaceSeconds: number | null;
  elapsedPaceSeconds: number | null;
  paceSeconds: number | null;
  activitySeconds: number | null;
  elapsedSeconds: number | null;
  avgHeartRate: number | null;
  maxHeartRate: number | null;
  bestEfforts: BestEffortSeconds;
};

type MonthlySummary = {
  year: number;
  month: number;
  runs: number;
  totalMiles: number | null;
  averagePaceSeconds: number | null;
  bestDistanceMiles: number | null;
  bestDistanceFilename: string | null;
  bestDistancePaceSeconds: number | null;
  bestPaceSeconds: number | null;
  bestPaceFilename: string | null;
  bestPaceDistanceMiles: number | null;
  listThumbnailFilename: string | null;
};

const BEST_EFFORT_COLS: {
  key: keyof BestEffortSeconds;
  label: string;
  miles: number;
}[] = [
  { key: "best1MileSeconds", label: "1mi", miles: 1.0 },
  { key: "best5KSeconds", label: "5K", miles: 3.10686 },
  { key: "best10KSeconds", label: "10K", miles: 6.21371 },
  { key: "best10MileSeconds", label: "10mi", miles: 10.0 },
  { key: "best20KSeconds", label: "20K", miles: 12.4274 },
  { key: "bestHalfSeconds", label: "Half", miles: 13.1094 },
  { key: "best25KSeconds", label: "25K", miles: 15.534 },
  { key: "best30KSeconds", label: "30K", miles: 18.6411 },
  { key: "best35KSeconds", label: "35K", miles: 21.748 },
  { key: "best40KSeconds", label: "40K", miles: 24.8548 },
  { key: "bestMarathonSeconds", label: "Full", miles: 26.2188 },
];

type BestEffortColumnWinners = Record<keyof BestEffortSeconds, string | null>;

function getDatePartsFromFilename(
  filename: string,
): { year: number; month: number; day: number } | null {
  const match = filename.match(/^(\d{4})-(\d{2})-(\d{2})_/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isInteger(year) || month < 1 || month > 12) return null;
  if (!Number.isInteger(day) || day < 1 || day > 31) return null;

  return { year, month, day };
}

function formatDateFromFilename(
  filename: string | null,
  fallbackYear: number,
  fallbackMonth: number,
): string {
  const parts = filename ? getDatePartsFromFilename(filename) : null;
  return formatCalendarDate(
    parts?.year ?? fallbackYear,
    parts?.month ?? fallbackMonth,
    parts?.day ?? 1,
  );
}

export default function RunSummary({
  images,
  activeYear,
  activeMonth,
  onYearChange,
  onMonthChange,
}: RunSummaryProps) {
  const [openSummary, setOpenSummary] = useState<SummaryAccordion>("list");

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
    // LIST view respects both year and month filters.
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

  const bestScopeImages = useMemo(() => {
    // BEST view is year-scoped only (month filter intentionally ignored).
    if (activeYear === "ALL") return images;

    return images.filter((image) => {
      const parts = getDatePartsFromFilename(image.filename);
      return parts?.year === activeYear;
    });
  }, [activeYear, images]);

  const monthlySummaries = useMemo(() => {
    const grouped = new Map<
      string,
      { year: number; month: number; runs: RunPoint[] }
    >();

    for (const image of bestScopeImages) {
      const parts = getDatePartsFromFilename(image.filename);
      if (!parts) continue;

      const distanceMiles = parseMiles(image);
      const activitySeconds = Number.isFinite(
        image.metadata?.metrics?.activityTime,
      )
        ? Number(image.metadata?.metrics?.activityTime)
        : null;
      const derivedPaceSeconds =
        distanceMiles != null && distanceMiles > 0 && activitySeconds != null
          ? activitySeconds / distanceMiles
          : null;
      const bestMileSeconds = Number.isFinite(
        image.metadata?.metrics?.bestMileSeconds,
      )
        ? Number(image.metadata?.metrics?.bestMileSeconds)
        : null;
      const paceSeconds = bestMileSeconds ?? derivedPaceSeconds;
      const key = `${parts.year}-${String(parts.month).padStart(2, "0")}`;

      const monthRuns = grouped.get(key) ?? {
        year: parts.year,
        month: parts.month,
        runs: [],
      };

      monthRuns.runs.push({
        filename: image.filename,
        distanceMiles,
        activitySeconds,
        paceSeconds,
      });

      grouped.set(key, monthRuns);
    }

    const summaries: MonthlySummary[] = [];
    for (const group of grouped.values()) {
      let totalMiles = 0;
      let hasDistance = false;
      let totalPaceMiles = 0;
      let totalPaceSeconds = 0;
      let bestDistanceMiles: number | null = null;
      let bestDistanceFilename: string | null = null;
      let bestDistancePaceSeconds: number | null = null;
      let bestPaceSeconds: number | null = null;
      let bestPaceFilename: string | null = null;
      let bestPaceDistanceMiles: number | null = null;

      for (const run of group.runs) {
        if (run.distanceMiles != null) {
          hasDistance = true;
          totalMiles += run.distanceMiles;

          if (
            bestDistanceMiles == null ||
            run.distanceMiles > bestDistanceMiles
          ) {
            bestDistanceMiles = run.distanceMiles;
            bestDistanceFilename = run.filename;
            bestDistancePaceSeconds = run.paceSeconds;
          }
        }

        if (
          run.activitySeconds != null &&
          run.distanceMiles != null &&
          run.distanceMiles > 0
        ) {
          totalPaceMiles += run.distanceMiles;
          totalPaceSeconds += run.activitySeconds;
        }

        if (run.paceSeconds != null && run.paceSeconds > 0) {
          if (bestPaceSeconds == null || run.paceSeconds < bestPaceSeconds) {
            bestPaceSeconds = run.paceSeconds;
            bestPaceFilename = run.filename;
            bestPaceDistanceMiles = run.distanceMiles;
          }
        }
      }

      const averagePaceSeconds =
        totalPaceMiles > 0 ? totalPaceSeconds / totalPaceMiles : null;

      summaries.push({
        year: group.year,
        month: group.month,
        runs: group.runs.length,
        totalMiles: hasDistance ? totalMiles : null,
        averagePaceSeconds,
        bestDistanceMiles,
        bestDistanceFilename,
        bestDistancePaceSeconds,
        bestPaceSeconds,
        bestPaceFilename,
        bestPaceDistanceMiles,
        listThumbnailFilename:
          bestDistanceFilename ?? group.runs[0]?.filename ?? null,
      });
    }

    return summaries.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });
  }, [bestScopeImages]);

  const allBadgeRuns = useMemo(() => {
    // Badge scope is intentionally independent of UI filters:
    // PB uses global all-activity best, SB uses per-year best.
    const runs: BadgeRunPoint[] = images.map((image) => {
      const parts = getDatePartsFromFilename(image.filename);
      const distanceMiles = parseMiles(image);
      const activitySeconds = Number.isFinite(
        image.metadata?.metrics?.activityTime,
      )
        ? Number(image.metadata?.metrics?.activityTime)
        : null;
      const derivedPaceSeconds =
        distanceMiles != null && distanceMiles > 0 && activitySeconds != null
          ? activitySeconds / distanceMiles
          : null;
      const bestMileSeconds = Number.isFinite(
        image.metadata?.metrics?.bestMileSeconds,
      )
        ? Number(image.metadata?.metrics?.bestMileSeconds)
        : null;

      return {
        year: parts?.year ?? null,
        distanceMiles,
        paceSeconds: bestMileSeconds ?? derivedPaceSeconds,
      };
    });

    return runs;
  }, [images]);

  const listRows = useMemo(() => {
    const rows: RunListRow[] = filteredImages.map((image) => {
      const parts = getDatePartsFromFilename(image.filename);
      const distanceMiles = parseMiles(image);
      const activitySeconds = Number.isFinite(
        image.metadata?.metrics?.activityTime,
      )
        ? Number(image.metadata?.metrics?.activityTime)
        : null;
      const derivedPaceSeconds =
        distanceMiles != null && distanceMiles > 0 && activitySeconds != null
          ? activitySeconds / distanceMiles
          : null;

      const m = image.metadata?.metrics;
      const n = (v: number | null | undefined) =>
        Number.isFinite(v) ? Number(v) : null;
      const elapsedSeconds = n(m?.elapsedTime);
      const elapsedPaceSeconds =
        distanceMiles != null && distanceMiles > 0 && elapsedSeconds != null
          ? elapsedSeconds / distanceMiles
          : null;

      return {
        filename: image.filename,
        year: parts?.year ?? null,
        month: parts?.month ?? null,
        day: parts?.day ?? null,
        distanceMiles,
        activityPaceSeconds: derivedPaceSeconds,
        elapsedPaceSeconds,
        paceSeconds: derivedPaceSeconds,
        activitySeconds,
        elapsedSeconds,
        avgHeartRate: n(m?.avgHeartRate),
        maxHeartRate: n(m?.maxHeartRate),
        bestEfforts: {
          best1MileSeconds: n(m?.best1MileSeconds),
          best5KSeconds: n(m?.best5KSeconds),
          best10KSeconds: n(m?.best10KSeconds),
          best10MileSeconds: n(m?.best10MileSeconds),
          best20KSeconds: n(m?.best20KSeconds),
          bestHalfSeconds: n(m?.bestHalfSeconds),
          best25KSeconds: n(m?.best25KSeconds),
          best30KSeconds: n(m?.best30KSeconds),
          best35KSeconds: n(m?.best35KSeconds),
          best40KSeconds: n(m?.best40KSeconds),
          bestMarathonSeconds: n(m?.bestMarathonSeconds),
        },
      };
    });

    return rows.sort((a, b) => b.filename.localeCompare(a.filename));
  }, [filteredImages]);

  const listTotalMiles = useMemo(() => {
    let totalMiles = 0;
    let hasDistance = false;

    for (const row of listRows) {
      if (row.distanceMiles != null) {
        totalMiles += row.distanceMiles;
        hasDistance = true;
      }
    }

    return hasDistance ? totalMiles : null;
  }, [listRows]);

  const listBucketStats = useMemo(() => {
    const counts = new Array(DISTANCE_BUCKETS.length).fill(0);
    let validDistanceRuns = 0;

    for (const row of listRows) {
      const bucketIndex = getDistanceBucketIndex(row.distanceMiles);
      if (bucketIndex == null) continue;
      counts[bucketIndex] += 1;
      validDistanceRuns += 1;
    }

    return DISTANCE_BUCKETS.map((bucket, index) => ({
      ...bucket,
      count: counts[index],
      percent:
        validDistanceRuns > 0
          ? Math.round((counts[index] / validDistanceRuns) * 100)
          : 0,
    }));
  }, [listRows]);

  const bestEffortColumnWinners = useMemo<BestEffortColumnWinners>(() => {
    const winners = Object.fromEntries(
      BEST_EFFORT_COLS.map((col) => [col.key, null]),
    ) as BestEffortColumnWinners;

    for (const { key } of BEST_EFFORT_COLS) {
      let bestValue: number | null = null;
      let bestFilename: string | null = null;

      for (const row of listRows) {
        const value = row.bestEfforts[key];
        if (!Number.isFinite(value) || value == null || value <= 0) continue;

        if (bestValue == null || value < bestValue) {
          bestValue = value;
          bestFilename = row.filename;
        }
      }

      winners[key] = bestFilename;
    }

    return winners;
  }, [listRows]);

  const bestDistanceGlobal = useMemo(() => {
    let value: number | null = null;
    for (const run of allBadgeRuns) {
      if (run.distanceMiles == null) continue;
      if (value == null || run.distanceMiles > value) {
        value = run.distanceMiles;
      }
    }
    return value;
  }, [allBadgeRuns]);

  const bestPaceGlobal = useMemo(() => {
    let value: number | null = null;
    for (const run of allBadgeRuns) {
      if (run.paceSeconds == null) continue;
      if (value == null || run.paceSeconds < value) {
        value = run.paceSeconds;
      }
    }
    return value;
  }, [allBadgeRuns]);

  const bestDistanceByYear = useMemo(() => {
    const byYear = new Map<number, number>();
    for (const run of allBadgeRuns) {
      if (run.year == null || run.distanceMiles == null) continue;

      const existing = byYear.get(run.year);
      if (existing == null || run.distanceMiles > existing) {
        byYear.set(run.year, run.distanceMiles);
      }
    }
    return byYear;
  }, [allBadgeRuns]);

  const bestPaceByYear = useMemo(() => {
    const byYear = new Map<number, number>();
    for (const run of allBadgeRuns) {
      if (run.year == null || run.paceSeconds == null) continue;

      const existing = byYear.get(run.year);
      if (existing == null || run.paceSeconds < existing) {
        byYear.set(run.year, run.paceSeconds);
      }
    }
    return byYear;
  }, [allBadgeRuns]);

  if (images.length === 0) return null;
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

  const listRowsCount = listRows.length;

  function getBadge(
    value: number | null,
    yearly: number | undefined,
    global: number | null,
  ) {
    // Priority: PB if value matches global best, otherwise SB if it matches
    // the year best for that metric.
    if (value == null) return null;
    if (isSameValue(value, global)) return "PB";
    if (yearly != null && isSameValue(value, yearly)) return "SB";
    return null;
  }

  function renderThumbnail(filename: string | null, alt: string) {
    if (!filename) {
      return <div className="run-summary-thumb-placeholder">-</div>;
    }

    const src = `/api/images/${encodeURIComponent(filename)}`;
    return (
      <Image
        className="run-summary-thumb"
        src={src}
        alt={alt}
        width={36}
        height={36}
        unoptimized
      />
    );
  }

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

        {activeYear !== "ALL" && openSummary !== "best" && (
          // Hide month chips while BEST is open to reinforce year-only BEST scope.
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

      <div className="run-summary-metrics" aria-label="FIT metrics summary">
        <span className="run-summary-metric-chip">
          FIT metrics: <strong>{availableMetricActivities}</strong>/{total}
        </span>
        <span className="run-summary-metric-chip">
          Avg {"♥"}: <strong>{scopedAverageHeartRate ?? "-"}</strong>
        </span>
        <span className="run-summary-metric-chip">
          Max {"♥"}: <strong>{scopedMaxHeartRate ?? "-"}</strong>
        </span>
        <span className="run-summary-metric-chip">
          Best mile: <strong>{formatSeconds(scopedBestMileSeconds)}</strong>
        </span>
      </div>

      <section className="dashboard-section run-summary-panel-section">
        <h2 className="accordion-heading">
          <button
            type="button"
            className="accordion-toggle"
            aria-expanded={openSummary === "best"}
            aria-controls="summary-best-panel"
            onClick={() =>
              setOpenSummary((current) => (current === "best" ? null : "best"))
            }
          >
            <span>Best Distance / Pace</span>
            <span className="accordion-icon" aria-hidden="true">
              {openSummary === "best" ? "-" : "+"}
            </span>
          </button>
        </h2>
        <div
          id="summary-best-panel"
          className={`accordion-panel ${openSummary === "best" ? "expanded" : "collapsed"}`}
          aria-hidden={openSummary !== "best"}
        >
          <div className="accordion-panel-content run-summary-best-content">
            <div className="run-summary-list-block">
              <h3 className="run-summary-list-title">Best Distance</h3>
              {monthlySummaries.map((row) => {
                const badge = getBadge(
                  row.bestDistanceMiles,
                  bestDistanceByYear.get(row.year),
                  bestDistanceGlobal,
                );
                const dateLabel = formatDateFromFilename(
                  row.bestDistanceFilename,
                  row.year,
                  row.month,
                );

                return (
                  <div
                    key={`best-distance-${row.year}-${row.month}`}
                    className="run-summary-list-row"
                  >
                    <span className="run-summary-list-date">{dateLabel}</span>
                    <span className="run-summary-list-badge-cell">
                      {badge ? (
                        <span
                          className={`run-summary-badge ${badge === "PB" ? "pb" : "sb"}`}
                        >
                          {badge}
                        </span>
                      ) : (
                        "-"
                      )}
                    </span>
                    <span className="run-summary-list-value run-summary-list-value-stack">
                      <span>{formatMiles(row.bestDistanceMiles)}</span>
                      <span className="run-summary-list-subvalue">
                        {formatPace(row.bestDistancePaceSeconds)}
                      </span>
                    </span>
                    <span className="run-summary-list-thumb-cell">
                      {renderThumbnail(
                        row.bestDistanceFilename,
                        `${row.year}-${String(row.month).padStart(2, "0")} best distance`,
                      )}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="run-summary-list-block">
              <h3 className="run-summary-list-title">Best Pace</h3>
              {monthlySummaries.map((row) => {
                const badge = getBadge(
                  row.bestPaceSeconds,
                  bestPaceByYear.get(row.year),
                  bestPaceGlobal,
                );
                const dateLabel = formatDateFromFilename(
                  row.bestPaceFilename,
                  row.year,
                  row.month,
                );

                return (
                  <div
                    key={`best-pace-${row.year}-${row.month}`}
                    className="run-summary-list-row"
                  >
                    <span className="run-summary-list-date">{dateLabel}</span>
                    <span className="run-summary-list-badge-cell">
                      {badge ? (
                        <span
                          className={`run-summary-badge ${badge === "PB" ? "pb" : "sb"}`}
                        >
                          {badge}
                        </span>
                      ) : (
                        "-"
                      )}
                    </span>
                    <span className="run-summary-list-value run-summary-list-value-stack">
                      <span>{formatPace(row.bestPaceSeconds)}</span>
                      <span className="run-summary-list-subvalue">
                        {formatMiles(row.bestPaceDistanceMiles)}
                      </span>
                    </span>
                    <span className="run-summary-list-thumb-cell">
                      {renderThumbnail(
                        row.bestPaceFilename,
                        `${row.year}-${String(row.month).padStart(2, "0")} best pace`,
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="dashboard-section run-summary-panel-section">
        <h2 className="accordion-heading">
          <button
            type="button"
            className="accordion-toggle run-summary-list-toggle"
            aria-expanded={openSummary === "list"}
            aria-controls="summary-list-panel"
            onClick={() =>
              setOpenSummary((current) => (current === "list" ? null : "list"))
            }
          >
            <span className="run-summary-list-toggle-title">
              Runs ({listRowsCount})
            </span>
            <span className="run-summary-list-toggle-mix" aria-hidden="true">
              <span className="run-summary-bar-wrapper">
                {listBucketStats.map((bucket) => (
                  <span
                    key={`mix-toggle-${bucket.label}`}
                    className="run-summary-bar-segment run-summary-mix-segment"
                    style={{
                      flex: Math.max(bucket.count, 0),
                      background: bucket.color,
                      minWidth: bucket.count > 0 ? "3px" : "0",
                    }}
                    data-tooltip={`${bucket.label} (${bucket.range}) - ${bucket.percent}%`}
                  />
                ))}
              </span>
            </span>
            <span className="accordion-icon" aria-hidden="true">
              {openSummary === "list" ? "-" : "+"}
            </span>
          </button>
        </h2>
        <div
          id="summary-list-panel"
          className={`accordion-panel ${openSummary === "list" ? "expanded" : "collapsed"}`}
          aria-hidden={openSummary !== "list"}
        >
          <div className="accordion-panel-content run-summary-list-content">
            <div className="run-summary-list-block">
              <div className="run-summary-list-total">
                Total Miles: <strong>{formatMiles(listTotalMiles)}</strong>
              </div>

              {listRows.map((row) => (
                <div
                  key={`list-${row.filename}`}
                  className="run-summary-list-row"
                >
                  <span className="run-summary-list-date">
                    {formatCalendarDate(row.year, row.month, row.day)}
                  </span>
                  <span className="run-summary-list-value">
                    {formatMiles(row.distanceMiles)}
                  </span>
                  <span className="run-summary-list-value-secondary">
                    <span className="run-summary-list-pace">
                      {formatPace(row.activityPaceSeconds)}
                    </span>
                    <span className="run-summary-list-meta">
                      Act {formatSeconds(row.activitySeconds)} · Elap{" "}
                      {formatSeconds(row.elapsedSeconds)} · {"♥"}{" "}
                      {formatHeartRate(row.avgHeartRate, row.maxHeartRate)}
                    </span>
                  </span>
                  <span className="run-summary-list-thumb-cell">
                    {renderThumbnail(
                      row.filename,
                      `${row.filename} run summary`,
                    )}
                  </span>
                  <div className="run-summary-best-effort-grid">
                    {BEST_EFFORT_COLS.map((col) => (
                      <span
                        key={`h-${col.key}`}
                        className="run-summary-bef-cell run-summary-bef-header"
                      >
                        {col.label}
                      </span>
                    ))}
                    {BEST_EFFORT_COLS.map((col) =>
                      (() => {
                        const effortSeconds = row.bestEfforts[col.key];
                        return (
                          <span
                            key={`v-${col.key}`}
                            className={`run-summary-bef-cell run-summary-bef-value ${
                              bestEffortColumnWinners[col.key] === row.filename
                                ? "highlight"
                                : ""
                            }`}
                          >
                            <span className="run-summary-bef-value-stack">
                              <span className="run-summary-bef-pace">
                                {formatPace(
                                  effortSeconds != null
                                    ? effortSeconds / col.miles
                                    : null,
                                )}
                              </span>
                              <span className="run-summary-bef-time">
                                {formatSeconds(effortSeconds)}
                              </span>
                            </span>
                          </span>
                        );
                      })(),
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </section>
  );
}
