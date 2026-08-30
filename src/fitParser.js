const FitParser = require("fit-file-parser").default;

function haversineDistance([lon1, lat1], [lon2, lat2]) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371000; // Earth radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return (R * c) / 1609.34; // Convert meters to miles
}

function getValue(object, keys) {
  for (const key of keys) {
    if (object[key] != null) {
      return object[key];
    }
  }
  return null;
}

const BEST_EFFORT_DISTANCES = [
  { key: "best1MileSeconds", miles: 1.0 },
  { key: "best5KSeconds", miles: 3.10686 },
  { key: "best10KSeconds", miles: 6.21371 },
  { key: "best10MileSeconds", miles: 10.0 },
  { key: "best20KSeconds", miles: 12.4274 },
  { key: "bestHalfSeconds", miles: 13.1094 },
  { key: "best25KSeconds", miles: 15.534 },
  { key: "best30KSeconds", miles: 18.6411 },
  { key: "best35KSeconds", miles: 21.748 },
  { key: "best40KSeconds", miles: 24.8548 },
  { key: "bestMarathonSeconds", miles: 26.2188 },
];

function computeBestEffortSeconds(samples, targetDistanceMiles) {
  if (!Array.isArray(samples) || samples.length < 2) {
    return null;
  }

  let best = Infinity;
  let start = 0;

  for (let end = 1; end < samples.length; end++) {
    const targetDistance = samples[end].distanceMiles - targetDistanceMiles;

    while (
      start + 1 < end &&
      samples[start + 1].distanceMiles <= targetDistance
    ) {
      start++;
    }

    const atStart = samples[start];
    if (atStart.distanceMiles > targetDistance) {
      continue;
    }

    let mileStartTime = null;
    if (Math.abs(atStart.distanceMiles - targetDistance) < 1e-9) {
      mileStartTime = atStart.timeSeconds;
    } else if (start + 1 <= end) {
      const afterStart = samples[start + 1];
      const distanceDelta = afterStart.distanceMiles - atStart.distanceMiles;
      if (distanceDelta <= 0) {
        continue;
      }

      const ratio = (targetDistance - atStart.distanceMiles) / distanceDelta;
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
    if (duration > 0 && duration < best) {
      best = duration;
    }
  }

  return Number.isFinite(best) ? best : null;
}

/**
 * Parse FIT binary content and extract coordinates and summary metrics.
 * @param {Buffer} fitBuffer - FIT file content as Buffer
 * @returns {Promise<Object>} Parsed activity data with normalized fields
 */
function parseFIT(fitBuffer) {
  return new Promise((resolve, reject) => {
    const parser = new FitParser({
      force: true,
      mode: "both",
      elapsedRecordField: true,
    });

    parser.parse(fitBuffer, (error, data) => {
      if (error) {
        reject(new Error(`Failed to parse FIT: ${error}`));
        return;
      }

      const records = Array.isArray(data.records) ? data.records : [];
      const sessions = Array.isArray(data.sessions)
        ? data.sessions
        : Array.isArray(data.activity?.sessions)
          ? data.activity.sessions
          : [];

      const coordinates = [];
      const times = [];
      const heartRates = [];
      const distanceTimeSamples = [];
      let maxDistanceMilesSeen = 0;

      for (const record of records) {
        const lat = getValue(record, ["position_lat", "positionLat"]);
        const lon = getValue(record, ["position_long", "positionLong"]);
        if (Number.isFinite(lat) && Number.isFinite(lon)) {
          coordinates.push([lon, lat]);
        }

        const recordTime = getValue(record, ["timestamp", "timeCreated"]);
        if (recordTime) {
          const epoch = new Date(recordTime).getTime();
          if (!Number.isNaN(epoch)) {
            times.push(epoch);
          }
        }

        const heartRate = getValue(record, ["heart_rate", "heartRate"]);
        if (Number.isFinite(heartRate)) {
          heartRates.push(heartRate);
        }

        const recordDistanceMeters = getValue(record, [
          "distance",
          "total_distance",
          "totalDistance",
        ]);
        if (
          Number.isFinite(recordDistanceMeters) &&
          Number.isFinite(recordTime ? new Date(recordTime).getTime() : NaN)
        ) {
          const distanceMiles = Math.max(
            recordDistanceMeters / 1609.34,
            maxDistanceMilesSeen,
          );
          maxDistanceMilesSeen = distanceMiles;
          distanceTimeSamples.push({
            distanceMiles,
            timeSeconds: new Date(recordTime).getTime() / 1000,
          });
        }
      }

      const session = sessions[0] || {};
      const sport = getValue(session, ["sport", "subSport"]);
      const startTime =
        getValue(session, ["start_time", "startTime"]) ||
        getValue(data.activity || {}, ["timestamp", "local_timestamp"]);
      const totalElapsedSeconds = getValue(session, [
        "total_elapsed_time",
        "totalElapsedTime",
      ]);
      const totalTimerSeconds = getValue(session, [
        "total_timer_time",
        "totalTimerTime",
      ]);
      const totalDistanceMeters = getValue(session, [
        "total_distance",
        "totalDistance",
      ]);

      let distance = null;
      if (Number.isFinite(totalDistanceMeters)) {
        distance = totalDistanceMeters / 1609.34;
      } else {
        distance = 0;
        for (let i = 1; i < coordinates.length; i++) {
          distance += haversineDistance(coordinates[i - 1], coordinates[i]);
        }
      }

      const parsedTime = startTime ? new Date(startTime).toISOString() : null;

      let elapsedTime = null;
      if (Number.isFinite(totalElapsedSeconds)) {
        elapsedTime = totalElapsedSeconds;
      } else if (times.length >= 2) {
        elapsedTime = (Math.max(...times) - Math.min(...times)) / 1000;
      }

      const movingTime = Number.isFinite(totalTimerSeconds)
        ? totalTimerSeconds
        : elapsedTime;

      const pace =
        Number.isFinite(movingTime) && distance > 0
          ? movingTime / distance
          : null;
      const bestEfforts = {};
      for (const { key, miles } of BEST_EFFORT_DISTANCES) {
        bestEfforts[key] = computeBestEffortSeconds(distanceTimeSamples, miles);
      }

      const avgHeartRate = Number.isFinite(
        getValue(session, ["avg_heart_rate", "avgHeartRate"]),
      )
        ? getValue(session, ["avg_heart_rate", "avgHeartRate"])
        : heartRates.length > 0
          ? heartRates.reduce((sum, value) => sum + value, 0) /
            heartRates.length
          : null;
      const maxHeartRate = Number.isFinite(
        getValue(session, ["max_heart_rate", "maxHeartRate"]),
      )
        ? getValue(session, ["max_heart_rate", "maxHeartRate"])
        : heartRates.length > 0
          ? Math.max(...heartRates)
          : null;

      resolve({
        name: sport || "FIT Activity",
        type: sport || "Unknown",
        time: parsedTime,
        coordinates,
        distance, // in miles
        pace, // seconds per mile
        metrics: {
          activityTime: movingTime,
          elapsedTime,
          totalTime: elapsedTime,
          avgHeartRate,
          maxHeartRate,
          totalAscent: getValue(session, ["total_ascent", "totalAscent"]),
          totalDescent: getValue(session, ["total_descent", "totalDescent"]),
          bestMileSeconds: bestEfforts.best1MileSeconds,
          ...bestEfforts,
        },
      });
    });
  });
}

module.exports = { parseFIT };
