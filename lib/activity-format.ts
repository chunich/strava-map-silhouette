import type { StravaActivity } from "@/lib/api-types";

const MILES_PER_METER = 0.000621371;

export function isRunningActivity(activity: StravaActivity): boolean {
  return String(activity.type || "") === "Run";
}

export function formatDistanceMiles(distanceMeters?: number): string {
  const meters = Number(distanceMeters || 0);
  return `${(meters * MILES_PER_METER).toFixed(2)} mi`;
}

export function formatMovingTime(minutesSeconds?: number): string {
  const seconds = Number(minutesSeconds || 0);
  return `${Math.floor(seconds / 60)} min`;
}

export function formatPace(
  distanceMeters?: number,
  movingSeconds?: number,
): string {
  const miles = Number(distanceMeters || 0) * MILES_PER_METER;
  const minutes = Number(movingSeconds || 0) / 60;

  if (!miles || !minutes) {
    return "n/a";
  }

  return `${(minutes / miles).toFixed(2)} min/mi`;
}

export function formatStartDate(isoDate?: string): string {
  if (!isoDate) {
    return "n/a";
  }

  return new Date(isoDate).toLocaleString();
}
