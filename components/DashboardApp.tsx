"use client";

import { useCallback, useEffect, useState } from "react";
import ControlBar from "@/components/ControlBar";
import DashboardHeader from "@/components/DashboardHeader";
import ImageGallery from "@/components/ImageGallery";
import StatusBanner from "@/components/StatusBanner";
import StravaActivityList from "@/components/StravaActivityList";
import {
  generateImages,
  generateImagesFromStrava,
  getHealth,
  getStravaActivities,
  listImages,
  stitchImages,
} from "@/lib/api-client";
import type { StatusTone, StravaActivity } from "@/lib/api-types";

type StatusState = {
  tone: StatusTone;
  message: string;
  links?: Array<{ label: string; href: string }>;
};

export default function DashboardApp() {
  const [healthStatus, setHealthStatus] = useState<"checking" | "ok" | "error">(
    "checking",
  );
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [status, setStatus] = useState<StatusState | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [hideFilenames, setHideFilenames] = useState(false);
  const [imageColumns, setImageColumns] = useState(12);
  const [activities, setActivities] = useState<StravaActivity[]>([]);
  const [showRunningOnly, setShowRunningOnly] = useState(false);

  const refreshImages = useCallback(async () => {
    setLoadingAction("refresh");
    try {
      const response = await listImages();
      setImages(response.images || []);
      setStatus({
        tone: "info",
        message: `Loaded ${response.images.length} image(s).`,
      });
    } catch (error) {
      setStatus({
        tone: "error",
        message:
          error instanceof Error ? error.message : "Failed to load images",
      });
    } finally {
      setLoadingAction(null);
    }
  }, []);

  const runGenerateFromFiles = useCallback(async () => {
    setLoadingAction("gpx");
    setStatus({
      tone: "info",
      message: "Generating images from GPX/TCX files...",
    });
    try {
      const response = await generateImages();
      setStatus({
        tone: "success",
        message: `Generated ${response.summary.successful} of ${response.summary.total} image(s).`,
      });
      await refreshImages();
    } catch (error) {
      setStatus({
        tone: "error",
        message: error instanceof Error ? error.message : "Generation failed",
      });
    } finally {
      setLoadingAction(null);
    }
  }, [refreshImages]);

  const runGenerateFromStrava = useCallback(async () => {
    setLoadingAction("strava");
    setStatus({ tone: "info", message: "Generating images from Strava..." });
    try {
      const response = await generateImagesFromStrava();
      setStatus({
        tone: "success",
        message: `Generated ${response.summary.successful} of ${response.summary.total} Strava image(s).`,
      });
      await refreshImages();
    } catch (error) {
      setStatus({
        tone: "error",
        message:
          error instanceof Error ? error.message : "Strava generation failed",
      });
    } finally {
      setLoadingAction(null);
    }
  }, [refreshImages]);

  const runStitch = useCallback(async () => {
    setLoadingAction("stitch");
    setStatus({ tone: "info", message: "Stitching images..." });
    try {
      const response = await stitchImages();
      const stitchedLinks = response.results
        .filter((result) => Boolean(result.success && result.pngFile))
        .map((result) => ({
          label: String(result.pngFile),
          href: `/api/images/${encodeURIComponent(String(result.pngFile))}`,
        }));

      setStatus({
        tone: "success",
        message: `Stitch complete for ${response.summary.successful} year(s).`,
        links: stitchedLinks,
      });
    } catch (error) {
      setStatus({
        tone: "error",
        message: error instanceof Error ? error.message : "Stitch failed",
      });
    } finally {
      setLoadingAction(null);
    }
  }, []);

  const loadStravaActivities = useCallback(async () => {
    setLoadingAction("load-strava");
    setStatus({ tone: "info", message: "Loading Strava activities..." });
    try {
      const response = await getStravaActivities();
      setActivities(response.activities || []);
      setStatus({
        tone: "success",
        message: response.message,
      });
    } catch (error) {
      setStatus({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to load Strava activities",
      });
    } finally {
      setLoadingAction(null);
    }
  }, []);

  useEffect(() => {
    async function bootstrap() {
      try {
        const health = await getHealth();
        setHealthStatus(
          String(health.status).toLowerCase() === "ok" ? "ok" : "error",
        );
      } catch {
        setHealthStatus("error");
      }

      await refreshImages();
    }

    void bootstrap();
  }, [refreshImages]);

  return (
    <main className="dashboard-wrap">
      <DashboardHeader healthStatus={healthStatus} />
      <p className="legacy-link-row">
        Legacy fallback is still available at{" "}
        <a href="/legacy-demo">/legacy-demo</a>.
      </p>

      <ControlBar
        hideFilenames={hideFilenames}
        imageColumns={imageColumns}
        loadingAction={loadingAction}
        onRefresh={() => {
          void refreshImages();
        }}
        onGenerateFromFiles={() => {
          void runGenerateFromFiles();
        }}
        onGenerateFromStrava={() => {
          void runGenerateFromStrava();
        }}
        onStitch={() => {
          void runStitch();
        }}
        onLoadStrava={() => {
          void loadStravaActivities();
        }}
        onToggleFilenames={setHideFilenames}
        onImageColumnsChange={setImageColumns}
      />

      {status ? (
        <StatusBanner
          tone={status.tone}
          message={status.message}
          links={status.links}
        />
      ) : null}

      <section className="dashboard-section">
        <h2>Generated Images</h2>
        <ImageGallery
          images={images}
          hideFilenames={hideFilenames}
          imageColumns={imageColumns}
        />
      </section>

      <section className="dashboard-section">
        <h2>Strava Activities</h2>
        <StravaActivityList
          activities={activities}
          showRunningOnly={showRunningOnly}
          onToggleRunningOnly={setShowRunningOnly}
        />
      </section>
    </main>
  );
}
