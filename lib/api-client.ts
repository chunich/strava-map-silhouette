import type {
  ApiErrorPayload,
  GenerateFromStravaResponse,
  GenerateImagesResponse,
  HealthResponse,
  ImageListResponse,
  StitchResponse,
  StravaActivitiesResponse,
} from "@/lib/api-types";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function parseError(response: Response): Promise<ApiError> {
  let payload: ApiErrorPayload | null = null;

  try {
    payload = (await response.json()) as ApiErrorPayload;
  } catch {
    payload = null;
  }

  const message =
    payload?.message ||
    payload?.error ||
    `Request failed with ${response.status}`;

  return new ApiError(message, response.status);
}

async function fetchJson<T>(
  input: RequestInfo,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    throw await parseError(response);
  }

  return (await response.json()) as T;
}

export function getHealth() {
  return fetchJson<HealthResponse>("/api/health");
}

export function listImages() {
  return fetchJson<ImageListResponse>("/api/images");
}

export function generateImages() {
  return fetchJson<GenerateImagesResponse>("/api/images/generate", {
    method: "POST",
  });
}

export function generateImagesFromStrava(after?: number, before?: number) {
  return fetchJson<GenerateFromStravaResponse>(
    "/api/images/generate-from-strava",
    {
      method: "POST",
      body: JSON.stringify({ after, before }),
    },
  );
}

export function stitchImages() {
  return fetchJson<StitchResponse>("/api/images/stitch", {
    method: "POST",
  });
}

export function getStravaActivities() {
  return fetchJson<StravaActivitiesResponse>("/api/strava/activities");
}
