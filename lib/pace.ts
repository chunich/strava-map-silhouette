export function secondsToPaceLabel(secondsPerMile: number): string {
  const rounded = Math.max(0, Math.round(secondsPerMile));
  const minutes = Math.floor(rounded / 60);
  const seconds = rounded % 60;

  return `${minutes}'${String(seconds).padStart(2, "0")}"/mi`;
}

export function formatFinishTime(totalSeconds: number): string {
  const rounded = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const seconds = rounded % 60;

  return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
