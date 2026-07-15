export type StatusTone = "success" | "error" | "info";

export type ApiErrorPayload = {
  error: string;
  message?: string;
  hint?: string;
};

export type HealthResponse = {
  status: string;
  config: {
    sourceDir: string;
    outputDir: string;
    filterType: string;
    activityLookupDays: number;
  };
};

export type ImageMetadata = {
  titleLabel?: string;
  metrics?: {
    activityTime?: number | null;
    elapsedTime?: number | null;
    totalTime?: number | null;
    avgHeartRate?: number | null;
    maxHeartRate?: number | null;
    totalAscent?: number | null;
    totalDescent?: number | null;
    bestMileSeconds?: number | null;
  };
};

export type ImageListItem = {
  filename: string;
  metadata?: ImageMetadata;
};

export type ImageListResponse = {
  images: ImageListItem[];
};

export type GeneratedImageResult = {
  gpxFile: string;
  success: boolean;
  outputImage: string | null;
  error: string | null;
};

export type GenerateImagesResponse = {
  message: string;
  summary: {
    total: number;
    successful: number;
    failed: number;
    skipped?: number;
  };
  results: GeneratedImageResult[];
};

export type GenerateFromStravaResponse = {
  message: string;
  summary: {
    total: number;
    successful: number;
    failed: number;
    skipped: number;
  };
};

export type StitchResult = {
  year: string;
  filename?: string;
  imageCount?: number;
  totalImages?: number;
  grid?: {
    columns: number;
    rows: number;
  };
  dimensions?: {
    width: number;
    height: number;
  };
  svgFile?: string;
  pngFile?: string;
  success?: boolean;
  error?: string;
};

export type StitchResponse = {
  message: string;
  summary: {
    totalYears: number;
    successful: number;
    failed: number;
  };
  results: StitchResult[];
};

export type StravaActivity = {
  id?: number;
  name?: string;
  type?: string;
  distance?: number;
  moving_time?: number;
  start_date?: string;
  [key: string]: unknown;
};

export type StravaActivitiesResponse = {
  message: string;
  activities: StravaActivity[];
};
