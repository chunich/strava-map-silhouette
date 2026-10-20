// Shared "best effort" sliding-window search, used by both the FIT parser
// (existing persisted summary metrics) and the on-demand pace-samples API
// route (which also needs to know *where* the winning window occurred so it
// can be highlighted on a chart).

const BEST_EFFORT_DISTANCES = [
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

/**
 * Find the fastest contiguous window covering exactly targetDistanceMiles
 * within a series of cumulative {distanceMiles, timeSeconds} samples.
 * @param {{distanceMiles: number, timeSeconds: number}[]} samples
 * @param {number} targetDistanceMiles
 * @returns {{durationSeconds: number, startTimeSeconds: number, endTimeSeconds: number, startDistanceMiles: number, endDistanceMiles: number} | null}
 */
function findBestEffortWindow(samples, targetDistanceMiles) {
  if (!Array.isArray(samples) || samples.length < 2) {
    return null;
  }

  let best = null;
  let start = 0;

  for (let end = 1; end < samples.length; end++) {
    const thresholdDistance = samples[end].distanceMiles - targetDistanceMiles;

    while (
      start + 1 < end &&
      samples[start + 1].distanceMiles <= thresholdDistance
    ) {
      start++;
    }

    const atStart = samples[start];
    if (atStart.distanceMiles > thresholdDistance) {
      continue;
    }

    let mileStartTime = null;
    if (Math.abs(atStart.distanceMiles - thresholdDistance) < 1e-9) {
      mileStartTime = atStart.timeSeconds;
    } else if (start + 1 <= end) {
      const afterStart = samples[start + 1];
      const distanceDelta = afterStart.distanceMiles - atStart.distanceMiles;
      if (distanceDelta <= 0) {
        continue;
      }

      const ratio = (thresholdDistance - atStart.distanceMiles) / distanceDelta;
      if (ratio < 0 || ratio > 1) {
        continue;
      }

      mileStartTime =
        atStart.timeSeconds +
        ratio * (afterStart.timeSeconds - atStart.timeSeconds);
    }

    if (!Number.isFinite(mileStartTime)) {
      continue;
    }

    const duration = samples[end].timeSeconds - mileStartTime;
    if (duration > 0 && (best == null || duration < best.durationSeconds)) {
      best = {
        durationSeconds: duration,
        startTimeSeconds: mileStartTime,
        endTimeSeconds: samples[end].timeSeconds,
        startDistanceMiles: thresholdDistance,
        endDistanceMiles: samples[end].distanceMiles,
      };
    }
  }

  return best;
}

/**
 * @param {{distanceMiles: number, timeSeconds: number}[]} samples
 * @param {number} targetDistanceMiles
 * @returns {number | null} duration in seconds, or null if the run never covers the target distance
 */
function computeBestEffortSeconds(samples, targetDistanceMiles) {
  const window = findBestEffortWindow(samples, targetDistanceMiles);
  return window ? window.durationSeconds : null;
}

module.exports = {
  BEST_EFFORT_DISTANCES,
  computeBestEffortSeconds,
  findBestEffortWindow,
};
