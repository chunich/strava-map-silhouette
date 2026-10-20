"use client";

import { useEffect, useState } from "react";
import RunPaceChart, {
  type PaceChartPoint,
  type PaceChartHighlight,
} from "@/components/RunPaceChart";
import {
  BEST_EFFORT_COLS,
  type BestEffortSeconds,
  formatDateFromFilename,
  formatMiles,
  formatPace,
  formatSeconds,
} from "@/lib/run-format";

type BestWindow = {
  durationSeconds: number;
  startTimeSeconds: number;
  endTimeSeconds: number;
  startDistanceMiles: number;
  endDistanceMiles: number;
};

type PaceSamplesResponse = {
  points: PaceChartPoint[];
  bestWindows: Record<keyof BestEffortSeconds, BestWindow | null>;
};

type RunDetailModalProps = {
  filename: string;
  fallbackYear: number;
  fallbackMonth: number;
  onClose: () => void;
};

const DEFAULT_MAX_CHART_POINTS = 300;
const DEFAULT_PACE_WINDOW_SECONDS = 26;

export default function RunDetailModal({
  filename,
  fallbackYear,
  fallbackMonth,
  onClose,
}: RunDetailModalProps) {
  const [data, setData] = useState<PaceSamplesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<
    keyof BestEffortSeconds | null
  >(null);
  const [maxChartPoints, setMaxChartPoints] = useState(
    DEFAULT_MAX_CHART_POINTS,
  );
  const [paceWindowSeconds, setPaceWindowSeconds] = useState(
    DEFAULT_PACE_WINDOW_SECONDS,
  );

  useEffect(() => {
    let cancelled = false;

    const url = new URL(
      `/api/images/${encodeURIComponent(filename)}/pace-samples`,
      window.location.origin,
    );
    url.searchParams.set("maxChartPoints", String(maxChartPoints));
    url.searchParams.set("paceWindowSeconds", String(paceWindowSeconds));

    fetch(url.toString())
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) {
          throw new Error(body?.message || body?.error || "Request failed");
        }
        return body as PaceSamplesResponse;
      })
      .then((body) => {
        if (!cancelled) setData(body);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [filename, maxChartPoints, paceWindowSeconds]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const lastPoint = data?.points[data.points.length - 1] ?? null;
  const totalDistanceMiles = lastPoint?.distanceMiles ?? null;
  const totalTimeSeconds = lastPoint?.timeSeconds ?? null;
  const overallPaceSecondsPerMile =
    totalDistanceMiles && totalTimeSeconds && totalDistanceMiles > 0
      ? totalTimeSeconds / totalDistanceMiles
      : null;

  const selectedWindow =
    selectedKey && data ? data.bestWindows[selectedKey] : null;

  const highlight: PaceChartHighlight | null = selectedWindow
    ? {
        startTimeSeconds: selectedWindow.startTimeSeconds,
        endTimeSeconds: selectedWindow.endTimeSeconds,
      }
    : null;

  return (
    <div className="run-detail-modal-overlay" onClick={onClose}>
      <div
        className="run-detail-modal"
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="run-detail-modal-header">
          <span className="run-detail-modal-title">
            {formatDateFromFilename(filename, fallbackYear, fallbackMonth)}
            {totalDistanceMiles != null && (
              <span className="run-detail-modal-subtitle">
                {formatMiles(totalDistanceMiles)} &middot;{" "}
                {formatPace(overallPaceSecondsPerMile)}
              </span>
            )}
          </span>
          <button
            type="button"
            className="run-detail-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            {"\u2715"}
          </button>
        </div>

        {isLoading && (
          <div className="run-detail-modal-status">Loading pace data...</div>
        )}

        {!isLoading && error && (
          <div className="run-detail-modal-status run-detail-modal-error">
            {error}
          </div>
        )}

        {!isLoading && !error && data && (
          <>
            <div className="run-detail-modal-settings">
              <label className="run-detail-modal-settings-field">
                <span>Points: {maxChartPoints}</span>
                <input
                  type="range"
                  min={100}
                  max={5000}
                  step={100}
                  value={maxChartPoints}
                  onChange={(event) =>
                    setMaxChartPoints(Number(event.target.value))
                  }
                />
              </label>
              <label className="run-detail-modal-settings-field">
                <span>Smoothing: {paceWindowSeconds}s</span>
                <input
                  type="range"
                  min={1}
                  max={60}
                  step={1}
                  value={paceWindowSeconds}
                  onChange={(event) =>
                    setPaceWindowSeconds(Number(event.target.value))
                  }
                />
              </label>
            </div>

            <RunPaceChart points={data.points} highlight={highlight} />

            <div className="run-detail-modal-chunks">
              {BEST_EFFORT_COLS.map((col) => {
                const window = data.bestWindows[col.key];
                const isSelected = selectedKey === col.key;
                return (
                  <button
                    key={col.key}
                    type="button"
                    disabled={!window}
                    className={`run-detail-modal-chunk-btn ${
                      isSelected ? "active" : ""
                    }`}
                    onClick={() => setSelectedKey(isSelected ? null : col.key)}
                  >
                    {col.label}
                  </button>
                );
              })}
            </div>

            {selectedWindow && (
              <div className="run-detail-modal-readout">
                <span>
                  <strong>
                    {formatPace(
                      selectedWindow.durationSeconds /
                        (selectedWindow.endDistanceMiles -
                          selectedWindow.startDistanceMiles),
                    )}
                  </strong>{" "}
                </span>
                <span>{formatSeconds(selectedWindow.durationSeconds)}</span>
                <span>
                  {formatSeconds(selectedWindow.startTimeSeconds)} {"\u2192"}{" "}
                  {formatSeconds(selectedWindow.endTimeSeconds)}
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
