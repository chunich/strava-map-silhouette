"use client";

import { useRef, useState } from "react";

export type TrendsBarChartBucket = {
  key: string;
  label: string;
  axisLabel: string;
  value: number;
};

type TrendsBarChartProps = {
  buckets: TrendsBarChartBucket[];
  formatValue: (value: number) => string;
};

const VIEW_WIDTH = 1400;
const VIEW_HEIGHT = 420;
const PAD_LEFT = 72;
const PAD_RIGHT = 16;
const PAD_TOP = 16;
const PAD_BOTTOM = 46;

const PLOT_WIDTH = VIEW_WIDTH - PAD_LEFT - PAD_RIGHT;
const PLOT_HEIGHT = VIEW_HEIGHT - PAD_TOP - PAD_BOTTOM;

function niceStep(maxValue: number): number {
  if (maxValue <= 0) return 1;
  const targetTicks = 5;
  const rawStep = maxValue / targetTicks;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep || 1));
  const normalized = rawStep / magnitude;
  const niceNormalized =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return niceNormalized * magnitude;
}

// Trailing simple moving average, using whatever points are available for
// the first few buckets (so the line still starts at the first bucket).
function movingAverage(values: number[], window: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - window + 1);
    const slice = values.slice(start, i + 1);
    const avg = slice.reduce((sum, v) => sum + v, 0) / slice.length;
    result.push(avg);
  }
  return result;
}

// Smooths a series of points into a Catmull-Rom spline rendered as cubic
// Beziers — the standard way trend lines are drawn over bar/column charts.
function buildSmoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x},${points[0].y}`;

  let d = `M ${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? i : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2 < points.length ? i + 2 : i + 1];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
  }
  return d;
}

export default function TrendsBarChart({
  buckets,
  formatValue,
}: TrendsBarChartProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const maxValue = buckets.length
    ? Math.max(...buckets.map((b) => b.value), 0)
    : 0;
  const step = niceStep(maxValue || 1);
  const axisMax = Math.max(step, Math.ceil((maxValue || 1) / step) * step);

  const ticks: number[] = [];
  for (let t = 0; t <= axisMax; t += step) {
    ticks.push(t);
  }

  function scaleY(value: number): number {
    const ratio = axisMax > 0 ? value / axisMax : 0;
    return PAD_TOP + PLOT_HEIGHT - ratio * PLOT_HEIGHT;
  }

  const count = buckets.length;
  const slotWidth = count > 0 ? PLOT_WIDTH / count : PLOT_WIDTH;
  const barWidth = Math.max(2, slotWidth * 0.6);

  function barX(index: number): number {
    return PAD_LEFT + index * slotWidth + (slotWidth - barWidth) / 2;
  }

  function slotCenterX(index: number): number {
    return PAD_LEFT + index * slotWidth + slotWidth / 2;
  }

  // Thin out x-axis labels when there are many buckets to avoid overlap.
  const labelStride = count > 14 ? Math.ceil(count / 14) : 1;

  // Overlay a smoothed moving-average trend line once there's enough data
  // for it to be meaningful (the common pattern in analytics dashboards).
  const trendWindow = count >= 12 ? 4 : count >= 6 ? 3 : 0;
  const trendPath =
    trendWindow > 0
      ? buildSmoothPath(
          movingAverage(
            buckets.map((b) => b.value),
            trendWindow,
          ).map((value, index) => ({
            x: slotCenterX(index),
            y: scaleY(value),
          })),
        )
      : "";

  function handleMouseMove(event: React.MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg || count === 0) return;
    const rect = svg.getBoundingClientRect();
    if (rect.width <= 0) return;
    const relX = (event.clientX - rect.left) / rect.width;
    const svgX = relX * VIEW_WIDTH;
    const index = Math.min(
      count - 1,
      Math.max(0, Math.floor((svgX - PAD_LEFT) / slotWidth)),
    );
    setHoverIndex(index);
  }

  function handleMouseLeave() {
    setHoverIndex(null);
  }

  const hoverBucket =
    hoverIndex != null && hoverIndex < buckets.length
      ? buckets[hoverIndex]
      : null;

  const tooltipWidth = 240;
  const tooltipHeight = 66;
  const tooltipX =
    hoverIndex != null
      ? Math.min(
          VIEW_WIDTH - PAD_RIGHT - tooltipWidth,
          Math.max(PAD_LEFT, slotCenterX(hoverIndex) - tooltipWidth / 2),
        )
      : 0;
  const tooltipY = PAD_TOP + 6;

  if (count === 0) {
    return <div className="trends-bar-chart-empty">No runs in range.</div>;
  }

  return (
    <svg
      ref={svgRef}
      className="trends-bar-chart"
      viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
      role="img"
      aria-label="Bar chart of totals over time"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {ticks.map((tick) => (
        <g key={`tick-${tick}`}>
          <line
            className="trends-bar-chart-gridline"
            x1={PAD_LEFT}
            x2={VIEW_WIDTH - PAD_RIGHT}
            y1={scaleY(tick)}
            y2={scaleY(tick)}
          />
          <text
            className="trends-bar-chart-axis-label"
            x={PAD_LEFT - 6}
            y={scaleY(tick)}
            textAnchor="end"
            dominantBaseline="middle"
          >
            {formatValue(tick)}
          </text>
        </g>
      ))}

      {buckets.map((bucket, index) => (
        <rect
          key={bucket.key}
          className={`trends-bar-chart-bar ${
            hoverIndex === index ? "hover" : ""
          }`}
          x={barX(index)}
          y={scaleY(bucket.value)}
          width={barWidth}
          height={Math.max(0, scaleY(0) - scaleY(bucket.value))}
          rx={2}
        />
      ))}

      {trendPath && (
        <path
          className="trends-bar-chart-trend-line"
          d={trendPath}
          fill="none"
        />
      )}

      {buckets.map((bucket, index) =>
        index % labelStride === 0 ? (
          <text
            key={`label-${bucket.key}`}
            className="trends-bar-chart-axis-label"
            x={slotCenterX(index)}
            y={VIEW_HEIGHT - PAD_BOTTOM + 16}
            textAnchor="middle"
          >
            {bucket.axisLabel}
          </text>
        ) : null,
      )}

      <line
        className="trends-bar-chart-axis"
        x1={PAD_LEFT}
        x2={PAD_LEFT}
        y1={PAD_TOP}
        y2={VIEW_HEIGHT - PAD_BOTTOM}
      />
      <line
        className="trends-bar-chart-axis"
        x1={PAD_LEFT}
        x2={VIEW_WIDTH - PAD_RIGHT}
        y1={VIEW_HEIGHT - PAD_BOTTOM}
        y2={VIEW_HEIGHT - PAD_BOTTOM}
      />

      {hoverBucket && hoverIndex != null && (
        <g className="trends-bar-chart-hover">
          <line
            className="trends-bar-chart-hover-line"
            x1={slotCenterX(hoverIndex)}
            x2={slotCenterX(hoverIndex)}
            y1={PAD_TOP}
            y2={VIEW_HEIGHT - PAD_BOTTOM}
          />
          <g transform={`translate(${tooltipX}, ${tooltipY})`}>
            <rect
              className="trends-bar-chart-tooltip-bg"
              width={tooltipWidth}
              height={tooltipHeight}
              rx={6}
            />
            <text className="trends-bar-chart-tooltip-text" x={12} y={24}>
              {hoverBucket.label}
            </text>
            <text className="trends-bar-chart-tooltip-value" x={12} y={50}>
              {formatValue(hoverBucket.value)}
            </text>
          </g>
        </g>
      )}
    </svg>
  );
}
