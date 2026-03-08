// stravaService.js
// Service for fetching Strava activities via the Strava API v3

const https = require("https");
const polyline = require("@mapbox/polyline");

const STRAVA_API_BASE = "https://www.strava.com/api/v3";

/**
 * Strava API client with automatic token refresh
 */
class StravaClient {
  constructor(config) {
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.accessToken = config.accessToken;
    this.refreshToken = config.refreshToken;
    this.expiresAt = config.expiresAt;
    this.onTokenRefresh = config.onTokenRefresh; // Callback when token is refreshed
  }

  /**
   * Check if token is expired or about to expire (within 5 minutes)
   */
  isTokenExpired() {
    if (!this.expiresAt) return false;
    const now = Math.floor(Date.now() / 1000);
    return now >= this.expiresAt - 300; // 5 minute buffer
  }

  /**
   * Refresh the access token if needed
   */
  async ensureValidToken() {
    if (this.isTokenExpired() && this.refreshToken) {
      console.log("Token expired, refreshing...");
      const tokenData = await refreshAccessToken(
        this.clientId,
        this.clientSecret,
        this.refreshToken,
      );

      this.accessToken = tokenData.access_token;
      this.refreshToken = tokenData.refresh_token;
      this.expiresAt = tokenData.expires_at;

      // Notify caller about token update
      if (this.onTokenRefresh) {
        await this.onTokenRefresh(tokenData);
      }
    }
  }

  /**
   * Get activities with automatic token refresh on 401
   */
  async getActivities(options = {}) {
    await this.ensureValidToken();

    try {
      return await getActivities(this.accessToken, options);
    } catch (error) {
      // If unauthorized and we have a refresh token, try refreshing once
      if (error.message.includes("Unauthorized") && this.refreshToken) {
        console.log("Received 401, attempting token refresh...");
        const tokenData = await refreshAccessToken(
          this.clientId,
          this.clientSecret,
          this.refreshToken,
        );

        this.accessToken = tokenData.access_token;
        this.refreshToken = tokenData.refresh_token;
        this.expiresAt = tokenData.expires_at;

        if (this.onTokenRefresh) {
          await this.onTokenRefresh(tokenData);
        }

        // Retry with new token
        return await getActivities(this.accessToken, options);
      }
      throw error;
    }
  }

  /**
   * Get all activities with automatic pagination and token refresh
   */
  async getAllActivities(options = {}) {
    await this.ensureValidToken();

    const { after = null, before = null, pageSize = 20 } = options;
    const perPage = Math.min(pageSize, 200); // Cap at Strava's max

    return await this.getActivities({
      page: 1,
      pageSize: perPage,
      after,
      before,
    });
  }
}

/**
 * Get athlete's activities from Strava API
 * @param {string} accessToken - Strava OAuth access token
 * @param {Object} options - Query options
 * @param {number} options.page - Page number (default: 1)
 * @param {number} options.pageSize - Results per page, max 200 (default: 30)
 * @param {number} options.after - Epoch timestamp to use for filtering activities after
 * @param {number} options.before - Epoch timestamp to use for filtering activities before
 * @returns {Promise<Array>} Array of activity summaries
 */
async function getActivities(accessToken, options = {}) {
  const { page = 1, pageSize = 30, after = null, before = null } = options;

  const params = new URLSearchParams({
    page: page.toString(),
    pageSize: Math.min(pageSize, 200).toString(),
  });

  if (after) params.append("after", after.toString());
  if (before) params.append("before", before.toString());

  const url = `${STRAVA_API_BASE}/athlete/activities?${params.toString()}`;
  console.log(
    `[GET /athlete/activities] Fetching activities (page ${page}, pageSize ${pageSize}, after ${after}, before ${before})...`,
  );
  console.log(`[GET /athlete/activities] Fetching activities (url: ${url})`);

  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
      (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          if (res.statusCode === 200) {
            try {
              const activities = JSON.parse(data);
              resolve(activities.map(formatActivitySummary));
            } catch (error) {
              reject(new Error(`Failed to parse response: ${error.message}`));
            }
          } else if (res.statusCode === 401) {
            reject(
              new Error(
                `Unauthorized: Invalid or expired access token. Response: ${data}`,
              ),
            );
          } else if (res.statusCode === 429) {
            reject(new Error("Rate limit exceeded"));
          } else {
            reject(
              new Error(
                `API request failed with status ${res.statusCode}: ${data}`,
              ),
            );
          }
        });
      },
    );

    req.on("error", (error) => {
      reject(new Error(`Request failed: ${error.message}`));
    });

    req.end();
  });
}

/**
 * Get all activities with automatic pagination
 * @param {string} accessToken - Strava OAuth access token
 * @param {Object} options - Query options
 * @param {number} options.after - Epoch timestamp to use for filtering activities after
 * @param {number} options.before - Epoch timestamp to use for filtering activities before
 * @param {number} options.maxResults - Maximum number of results to return (default: unlimited)
 * @returns {Promise<Array>} Array of all activity summaries
 */
async function getAllActivities(accessToken, options = {}) {
  const { after = null, before = null, maxResults = Infinity } = options;
  const allActivities = [];
  let page = 1;
  const perPage = 200; // Max allowed by Strava

  while (allActivities.length < maxResults) {
    const activities = await getActivities(accessToken, {
      page,
      perPage,
      after,
      before,
    });

    if (activities.length === 0) break;

    allActivities.push(
      ...activities.slice(0, maxResults - allActivities.length),
    );

    if (activities.length < perPage || allActivities.length >= maxResults) {
      break;
    }

    page++;
  }

  return allActivities;
}

/**
 * Format activity summary from Strava API response
 * @param {Object} activity - Raw activity from Strava API
 * @returns {Object} Formatted activity summary
 */
function formatActivitySummary(activity) {
  return {
    id: activity.id,
    name: activity.name,
    type: activity.type,
    sportType: activity.sport_type,
    date: activity.start_date,
    localDate: activity.start_date_local,
    distance: activity.distance, // meters
    distanceMiles: (activity.distance * 0.000621371).toFixed(2),
    distanceKm: (activity.distance / 1000).toFixed(2),
    movingTime: activity.moving_time, // seconds
    elapsedTime: activity.elapsed_time, // seconds
    totalElevationGain: activity.total_elevation_gain, // meters
    averageSpeed: activity.average_speed, // m/s
    maxSpeed: activity.max_speed, // m/s
    averageHeartrate: activity.average_heartrate,
    maxHeartrate: activity.max_heartrate,
    paceMinPerMile: activity.average_speed
      ? (1609.34 / activity.average_speed / 60).toFixed(2)
      : null,
    start_date: activity.start_date,
    start_date_local: activity.start_date_local,
    moving_time: activity.moving_time,
    startLatlng: activity.start_latlng, // [lat, lng]
    endLatlng: activity.end_latlng, // [lat, lng]
    map: {
      id: activity.map?.id,
      summaryPolyline: activity.map?.summary_polyline,
      polyline: activity.map?.polyline,
    },
    timezone: activity.timezone,
    hasHeartrate: activity.has_heartrate,
    manual: activity.manual,
  };
}

/**
 * Exchange authorization code for access token
 * @param {string} clientId - Strava application client ID
 * @param {string} clientSecret - Strava application client secret
 * @param {string} code - Authorization code from OAuth callback
 * @returns {Promise<Object>} Token response with access_token, refresh_token, expires_at
 */
async function exchangeToken(clientId, clientSecret, code) {
  const data = JSON.stringify({
    client_id: clientId,
    client_secret: clientSecret,
    code: code,
    grant_type: "authorization_code",
  });

  return new Promise((resolve, reject) => {
    const req = https.request(
      "https://www.strava.com/oauth/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": data.length,
        },
      },
      (res) => {
        let responseData = "";

        res.on("data", (chunk) => {
          responseData += chunk;
        });

        res.on("end", () => {
          if (res.statusCode === 200) {
            resolve(JSON.parse(responseData));
          } else {
            reject(new Error(`Token exchange failed: ${responseData}`));
          }
        });
      },
    );

    req.on("error", (error) => {
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

/**
 * Refresh an expired access token
 * @param {string} clientId - Strava application client ID
 * @param {string} clientSecret - Strava application client secret
 * @param {string} refreshToken - Refresh token from previous authorization
 * @returns {Promise<Object>} Token response with new access_token, refresh_token, expires_at
 */
async function refreshAccessToken(clientId, clientSecret, refreshToken) {
  const data = JSON.stringify({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  console.log("[POST /oauth/token] Refreshing access token...");

  return new Promise((resolve, reject) => {
    const req = https.request(
      "https://www.strava.com/oauth/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": data.length,
        },
      },
      (res) => {
        let responseData = "";

        res.on("data", (chunk) => {
          responseData += chunk;
        });

        res.on("end", () => {
          if (res.statusCode === 200) {
            resolve(JSON.parse(responseData));
          } else {
            reject(new Error(`Token refresh failed: ${responseData}`));
          }
        });
      },
    );

    req.on("error", (error) => {
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

/**
 * Decode Google Encoded Polyline to coordinates
 * @param {string} encoded - Encoded polyline string
 * @returns {Array} Array of [lat, lng] pairs
 */
function decodePolyline(encoded) {
  if (!encoded) return [];
  return polyline.decode(encoded);
}

/**
 * Convert Strava activity to track format for SVG rendering
 * @param {Object} activity - Formatted activity from Strava API
 * @returns {Object} Track object ready for tracksToSVG
 */
function activityToTrack(activity) {
  const coordinates = decodePolyline(
    activity.map.polyline || activity.map.summaryPolyline,
  );

  if (coordinates.length === 0) {
    return null;
  }

  // Convert [lat, lng] to {lat, lng} format
  const polylines = [coordinates.map(([lat, lng]) => ({ lat, lng }))];

  return {
    polylines,
    isRace: false,
    name: activity.name,
    date: activity.localDate,
    distance: activity.distanceMiles,
  };
}

/**
 * Convert multiple Strava activities to tracks for grid rendering
 * @param {Array} activities - Array of formatted activities
 * @returns {Array} Array of track objects
 */
function activitiesToTracks(activities) {
  return activities.map(activityToTrack).filter((track) => track !== null);
}

module.exports = {
  StravaClient,
  getActivities,
  getAllActivities,
  formatActivitySummary,
  exchangeToken,
  refreshAccessToken,
  decodePolyline,
  activityToTrack,
  activitiesToTracks,
};
