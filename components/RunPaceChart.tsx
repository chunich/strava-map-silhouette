import { useMemo, useRef, useState } from "react";
import { secondsToPaceLabel, formatFinishTime } from "@/lib/pace";

export type PaceChartPoint = {
  timeSeconds: number;
  distanceMiles: number;
  paceSecondsPerMile: number | null;
};

export type PaceChartHighlight = {
  startTimeSeconds: number;
  endTimeSeconds: number;
};

type RunPaceChartProps = {
  points: PaceChartPoint[];
  highlight?: PaceChartHighlight | null;
};

const VIEW_WIDTH = 1400;
const VIEW_HEIGHT = 560;
const PAD_LEFT = 60;
const PAD_RIGHT = 16;
const PAD_TOP = 16;
const PAD_BOTTOM = 32;
const MIN_PACE_SECONDS_PER_MILE = 180;

const PLOT_WIDTH = VIEW_WIDTH - PAD_LEFT - PAD_RIGHT;
const PLOT_HEIGHT = VIEW_HEIGHT - PAD_TOP - PAD_BOTTOM;

function niceTimeStep(totalSeconds: number): number {
  const targetTicks = 6;
  const rawStep = totalSeconds / targetTicks;
  const steps = [60, 300, 600, 900, 1800, 3600, 7200];
  return steps.find((step) => step >= rawStep) ?? steps[steps.length - 1];
}

function buildTimeTicks(maxTimeSeconds: number): number[] {
  if (maxTimeSeconds <= 0) return [0];
  const step = niceTimeStep(maxTimeSeconds);
  const ticks: number[] = [];
  for (let t = 0; t <= maxTimeSeconds; t += step) {
    ticks.push(t);
  }
  if (ticks[ticks.length - 1] !== maxTimeSeconds) {
    ticks.push(maxTimeSeconds);
  }
  return ticks;
}

function nicePaceStep(rangeSeconds: number): number {
  const targetTicks = 5;
  const rawStep = rangeSeconds / targetTicks;
  const steps = [15, 30, 60, 90, 120, 180, 300];
  return steps.find((step) => step >= rawStep) ?? steps[steps.length - 1];
}

export default function RunPaceChart({
  points,
  highlight = null,
}: RunPaceChartProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const validPaces = points
    .map((p) => p.paceSecondsPerMile)
    .filter((p): p is number => Number.isFinite(p) && p != null && p > 0);

  const maxTimeSeconds = points.length
    ? points[points.length - 1].timeSeconds
    : 0;

  const paceMin = validPaces.length ? Math.min(...validPaces) : 300;
  const paceMax = validPaces.length ? Math.max(...validPaces) : 600;
  const paceStep = nicePaceStep(paceMax - paceMin || 60);
  const axisPaceMin = Math.max(
    MIN_PACE_SECONDS_PER_MILE,
    Math.floor(paceMin / paceStep) * paceStep - paceStep,
  );
  const axisPaceMax = Math.ceil(paceMax / paceStep) * paceStep + paceStep;

  function scaleX(timeSeconds: number): number {
    if (maxTimeSeconds <= 0) return PAD_LEFT;
    return PAD_LEFT + (timeSeconds / maxTimeSeconds) * PLOT_WIDTH;
  }

  function scaleY(paceSecondsPerMile: number): number {
    const clamped = Math.min(
      axisPaceMax,
      Math.max(axisPaceMin, paceSecondsPerMile),
    );
    // Faster pace (lower seconds/mile) renders higher on the chart (lower y).
    const ratio = (clamped - axisPaceMin) / (axisPaceMax - axisPaceMin || 1);
    return PAD_TOP + ratio * PLOT_HEIGHT;
  }

  const timeTicks = buildTimeTicks(maxTimeSeconds);
  const paceTicks: number[] = [];
  for (let p = axisPaceMin; p <= axisPaceMax; p += paceStep) {
    paceTicks.push(p);
  }

  let linePath = "";
  let penDown = false;
  for (const point of points) {
    if (point.paceSecondsPerMile == null) {
      penDown = false;
      continue;
    }
    const x = scaleX(point.timeSeconds);
    const y = scaleY(point.paceSecondsPerMile);
    linePath += `${penDown ? "L" : "M"} ${x},${y} `;
    penDown = true;
  }

  const sortedByTime = useMemo(() => points, [points]);

  function findNearestIndex(timeSeconds: number): number {
    if (sortedByTime.length === 0) return -1;
    let lo = 0;
    let hi = sortedByTime.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (sortedByTime[mid].timeSeconds < timeSeconds) lo = mid + 1;
      else hi = mid;
    }
    if (lo > 0) {
      const prevDiff = Math.abs(sortedByTime[lo - 1].timeSeconds - timeSeconds);
      const currDiff = Math.abs(sortedByTime[lo].timeSeconds - timeSeconds);
      if (prevDiff <= currDiff) return lo - 1;
    }
    return lo;
  }

  function handleMouseMove(event: React.MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg || maxTimeSeconds <= 0) return;
    const rect = svg.getBoundingClientRect();
    if (rect.width <= 0) return;
    const relX = (event.clientX - rect.left) / rect.width;
    const svgX = relX * VIEW_WIDTH;
    const clampedX = Math.min(VIEW_WIDTH - PAD_RIGHT, Math.max(PAD_LEFT, svgX));
    const timeSeconds = ((clampedX - PAD_LEFT) / PLOT_WIDTH) * maxTimeSeconds;
    const index = findNearestIndex(timeSeconds);
    setHoverIndex(index >= 0 ? index : null);
  }

  function handleMouseLeave() {
    setHoverIndex(null);
  }

  const hoverPoint =
    hoverIndex != null && hoverIndex < sortedByTime.length
      ? sortedByTime[hoverIndex]
      : null;
  const hoverX = hoverPoint ? scaleX(hoverPoint.timeSeconds) : null;
  const hoverY =
    hoverPoint && hoverPoint.paceSecondsPerMile != null
      ? scaleY(hoverPoint.paceSecondsPerMile)
      : null;

  const tooltipWidth = 150;
  const tooltipHeight = 44;
  const tooltipX =
    hoverX != null
      ? Math.min(
          VIEW_WIDTH - PAD_RIGHT - tooltipWidth,
          Math.max(PAD_LEFT, hoverX + 10),
        )
      : 0;
  const tooltipY = PAD_TOP + 6;

  return (
    <svg
      ref={svgRef}
      className="run-pace-chart"
      viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
      role="img"
      aria-label="Chart of pace over elapsed time for this run"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {paceTicks.map((pace) => (
        <g key={`pace-tick-${pace}`}>
          <line
            className="run-pace-chart-gridline"
            x1={PAD_LEFT}
            x2={VIEW_WIDTH - PAD_RIGHT}
            y1={scaleY(pace)}
            y2={scaleY(pace)}
          />
          <text
            className="run-pace-chart-axis-label"
            x={PAD_LEFT - 6}
            y={scaleY(pace)}
            textAnchor="end"
            dominantBaseline="middle"
          >
            {secondsToPaceLabel(pace).replace('"/mi', "")}
          </text>
        </g>
      ))}

      {timeTicks.map((time) => (
        <text
          key={`time-tick-${time}`}
          className="run-pace-chart-axis-label"
          x={scaleX(time)}
          y={VIEW_HEIGHT - PAD_BOTTOM + 16}
          textAnchor="middle"
        >
          {formatFinishTime(time)}
        </text>
      ))}

      {highlight && (
        <rect
          className="run-pace-chart-highlight"
          x={scaleX(highlight.startTimeSeconds)}
          y={PAD_TOP}
          width={Math.max(
            0,
            scaleX(highlight.endTimeSeconds) -
              scaleX(highlight.startTimeSeconds),
          )}
          height={PLOT_HEIGHT}
        />
      )}

      <line
        className="run-pace-chart-axis"
        x1={PAD_LEFT}
        x2={PAD_LEFT}
        y1={PAD_TOP}
        y2={VIEW_HEIGHT - PAD_BOTTOM}
      />
      <line
        className="run-pace-chart-axis"
        x1={PAD_LEFT}
        x2={VIEW_WIDTH - PAD_RIGHT}
        y1={VIEW_HEIGHT - PAD_BOTTOM}
        y2={VIEW_HEIGHT - PAD_BOTTOM}
      />

      <path className="run-pace-chart-line" d={linePath.trim()} fill="none" />

      {hoverPoint && hoverX != null && (
        <g className="run-pace-chart-hover">
          <line
            className="run-pace-chart-hover-line"
            x1={hoverX}
            x2={hoverX}
            y1={PAD_TOP}
            y2={VIEW_HEIGHT - PAD_BOTTOM}
          />
          {hoverY != null && (
            <circle
              className="run-pace-chart-hover-dot"
              cx={hoverX}
              cy={hoverY}
              r={4}
            />
          )}
          <g transform={`translate(${tooltipX}, ${tooltipY})`}>
            <rect
              className="run-pace-chart-tooltip-bg"
              width={tooltipWidth}
              height={tooltipHeight}
              rx={6}
            />
            <text className="run-pace-chart-tooltip-text" x={10} y={18}>
              {formatFinishTime(hoverPoint.timeSeconds)}
            </text>
            <text className="run-pace-chart-tooltip-text" x={10} y={34}>
              {hoverPoint.paceSecondsPerMile != null
                ? secondsToPaceLabel(hoverPoint.paceSecondsPerMile)
                : "no data"}
            </text>
          </g>
        </g>
      )}
    </svg>
  );
}
