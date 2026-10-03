"use client";

import { useState } from "react";
import Link from "next/link";
import PaceChart from "@/components/PaceChart";
import { formatFinishTime, secondsToPaceLabel } from "@/lib/pace";

const PACE_MIN = 480;
const PACE_MAX = 720;
const PACE_STEP = 1;
const DEFAULT_PACE = 540;

const GROUP_A_MILES = 10;
const GROUP_B_MILES = 10;
const GROUP_C_MILES = 6.218;

export default function PacePlanner() {
  const [paceA, setPaceA] = useState(DEFAULT_PACE);
  const [paceB, setPaceB] = useState(DEFAULT_PACE);
  const [paceC, setPaceC] = useState(DEFAULT_PACE);

  const totalSeconds =
    GROUP_A_MILES * paceA + GROUP_B_MILES * paceB + GROUP_C_MILES * paceC;
  const averagePace =
    totalSeconds / (GROUP_A_MILES + GROUP_B_MILES + GROUP_C_MILES);

  return (
    <main className="dashboard-wrap pace-planner-wrap">
      <Link href="/" className="pace-planner-back-link">
        &larr; Back to dashboard
      </Link>

      <h1 className="pace-planner-title">Marathon Pace Planner</h1>

      <div className="pace-planner-group">
        <label htmlFor="pace-group-a">
          Miles 0 – {GROUP_A_MILES}{" "}
          <span className="pace-planner-value">
            {secondsToPaceLabel(paceA)}
          </span>
        </label>
        <input
          id="pace-group-a"
          type="range"
          min={PACE_MIN}
          max={PACE_MAX}
          step={PACE_STEP}
          value={paceA}
          onChange={(event) => setPaceA(Number(event.target.value))}
        />
      </div>

      <div className="pace-planner-group">
        <label htmlFor="pace-group-b">
          Miles {GROUP_A_MILES} – {GROUP_A_MILES + GROUP_B_MILES}{" "}
          <span className="pace-planner-value">
            {secondsToPaceLabel(paceB)}
          </span>
        </label>
        <input
          id="pace-group-b"
          type="range"
          min={PACE_MIN}
          max={PACE_MAX}
          step={PACE_STEP}
          value={paceB}
          onChange={(event) => setPaceB(Number(event.target.value))}
        />
      </div>

      <div className="pace-planner-group">
        <label htmlFor="pace-group-c">
          Miles {GROUP_A_MILES + GROUP_B_MILES} – 26.218{" "}
          <span className="pace-planner-value">
            {secondsToPaceLabel(paceC)}
          </span>
        </label>
        <input
          id="pace-group-c"
          type="range"
          min={PACE_MIN}
          max={PACE_MAX}
          step={PACE_STEP}
          value={paceC}
          onChange={(event) => setPaceC(Number(event.target.value))}
        />
      </div>

      <div className="pace-planner-summary">
        <div>
          <span className="pace-planner-summary-label">Finish time</span>
          <span className="pace-planner-summary-value">
            {formatFinishTime(totalSeconds)}
          </span>
        </div>
        <div>
          <span className="pace-planner-summary-label">Average pace</span>
          <span className="pace-planner-summary-value">
            {secondsToPaceLabel(averagePace)}
          </span>
        </div>
      </div>

      <PaceChart paceA={paceA} paceB={paceB} paceC={paceC} />
    </main>
  );
}
