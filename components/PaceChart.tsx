import { secondsToPaceLabel } from "@/lib/pace";

type PaceChartProps = {
  paceA: number;
  paceB: number;
  paceC: number;
};

const TOTAL_MILES = 26.2;
const GROUP_A_END = 10;
const GROUP_B_END = 20;

const PACE_MIN = 480;
const PACE_MAX = 720;
const PACE_TICKS = [480, 540, 600, 660, 720];
const MILE_TICKS = [0, 5, 10, 15, 20, 25, TOTAL_MILES];

const VIEW_WIDTH = 600;
const VIEW_HEIGHT = 260;
const PAD_LEFT = 42;
const PAD_RIGHT = 12;
const PAD_TOP = 12;
const PAD_BOTTOM = 26;

const PLOT_WIDTH = VIEW_WIDTH - PAD_LEFT - PAD_RIGHT;
const PLOT_HEIGHT = VIEW_HEIGHT - PAD_TOP - PAD_BOTTOM;

function scaleX(mile: number): number {
  return PAD_LEFT + (mile / TOTAL_MILES) * PLOT_WIDTH;
}

function scaleY(paceSeconds: number): number {
  const clamped = Math.min(PACE_MAX, Math.max(PACE_MIN, paceSeconds));
  const ratio = (clamped - PACE_MIN) / (PACE_MAX - PACE_MIN);
  return PAD_TOP + ratio * PLOT_HEIGHT;
}

type Point = { x: number; y: number };

// Converts a sequence of points into a smooth SVG path using a Catmull-Rom
// to cubic-Bezier conversion, so the line curves gently between the three
// group paces instead of forming sharp angles at the segment boundaries.
function buildSmoothPath(points: Point[]): string {
  if (points.length === 0) {
    return "";
  }

  if (points.length === 1) {
    return `M ${points[0].x},${points[0].y}`;
  }

  let path = `M ${points[0].x},${points[0].y}`;

  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
  }

  return path;
}

export default function PaceChart({ paceA, paceB, paceC }: PaceChartProps) {
  const groupAMid = GROUP_A_END / 2;
  const groupBMid = GROUP_A_END + (GROUP_B_END - GROUP_A_END) / 2;
  const groupCMid = GROUP_B_END + (TOTAL_MILES - GROUP_B_END) / 2;

  const anchors: Array<{ mile: number; pace: number }> = [
    { mile: 0, pace: paceA },
    { mile: groupAMid, pace: paceA },
    { mile: groupBMid, pace: paceB },
    { mile: groupCMid, pace: paceC },
    { mile: TOTAL_MILES, pace: paceC },
  ];

  const points = anchors.map((anchor) => ({
    x: scaleX(anchor.mile),
    y: scaleY(anchor.pace),
  }));

  const linePath = buildSmoothPath(points);

  return (
    <svg
      className="pace-chart"
      viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
      role="img"
      aria-label="Chart of planned pace across the marathon distance"
    >
      {PACE_TICKS.map((pace) => (
        <g key={`pace-tick-${pace}`}>
          <line
            className="pace-chart-gridline"
            x1={PAD_LEFT}
            x2={VIEW_WIDTH - PAD_RIGHT}
            y1={scaleY(pace)}
            y2={scaleY(pace)}
          />
          <text
            className="pace-chart-axis-label"
            x={PAD_LEFT - 6}
            y={scaleY(pace)}
            textAnchor="end"
            dominantBaseline="middle"
          >
            {secondsToPaceLabel(pace).replace('"/mi', "")}
          </text>
        </g>
      ))}

      {[GROUP_A_END, GROUP_B_END].map((mile) => (
        <line
          key={`boundary-${mile}`}
          className="pace-chart-boundary"
          x1={scaleX(mile)}
          x2={scaleX(mile)}
          y1={PAD_TOP}
          y2={VIEW_HEIGHT - PAD_BOTTOM}
        />
      ))}

      {MILE_TICKS.map((mile) => (
        <text
          key={`mile-tick-${mile}`}
          className="pace-chart-axis-label"
          x={scaleX(mile)}
          y={VIEW_HEIGHT - PAD_BOTTOM + 16}
          textAnchor="middle"
        >
          {Number.isInteger(mile) ? mile : mile.toFixed(1)}
        </text>
      ))}

      <line
        className="pace-chart-axis"
        x1={PAD_LEFT}
        x2={PAD_LEFT}
        y1={PAD_TOP}
        y2={VIEW_HEIGHT - PAD_BOTTOM}
      />
      <line
        className="pace-chart-axis"
        x1={PAD_LEFT}
        x2={VIEW_WIDTH - PAD_RIGHT}
        y1={VIEW_HEIGHT - PAD_BOTTOM}
        y2={VIEW_HEIGHT - PAD_BOTTOM}
      />

      <path className="pace-chart-line" d={linePath} fill="none" />
    </svg>
  );
}
