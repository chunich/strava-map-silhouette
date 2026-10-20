// Shared run-summary formatting helpers and best-effort column definitions,
// used by both components/RunSummary.tsx and the per-run pace-chart detail
// components (RunPaceChart/RunDetailModal) to avoid circular imports between
// components that reference each other.

export type BestEffortSeconds = {
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

export const BEST_EFFORT_COLS: {
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

export function formatSeconds(value: number | null): string {
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

export function formatMiles(value: number | null): string {
  if (!Number.isFinite(value) || value == null) return "-";
  return `${value.toFixed(2)} mi`;
}

export function formatPace(value: number | null): string {
  if (!Number.isFinite(value) || value == null || value <= 0) return "-";

  const rounded = Math.max(0, Math.round(value));
  const minutes = Math.floor(rounded / 60);
  const seconds = rounded % 60;

  return `${minutes}'${String(seconds).padStart(2, "0")}"/mi`;
}

export function formatHeartRate(
  avg: number | null,
  max: number | null,
): string {
  if (!Number.isFinite(avg) && !Number.isFinite(max)) return "-";

  const avgLabel = Number.isFinite(avg) ? Math.round(avg as number) : "-";
  const maxLabel = Number.isFinite(max) ? Math.round(max as number) : "-";
  return `${avgLabel}/${maxLabel}`;
}

export function formatCalendarDate(
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

export function formatMonthDotDay(
  month: number | null,
  day: number | null,
): string {
  if (
    month == null ||
    day == null ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    month < 1 ||
    day < 1
  ) {
    return "-";
  }

  return `${month}/${day}`;
}

export function getDatePartsFromFilename(
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

export function formatDateFromFilename(
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
