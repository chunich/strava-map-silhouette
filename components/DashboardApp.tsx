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
  stitchImages,
} from "@/lib/api-client";
import type { StatusTone } from "@/lib/api-types";
import { useHealthStatus } from "@/hooks/useHealthStatus";
import { useImageList } from "@/hooks/useImageList";
import { useStravaActivities } from "@/hooks/useStravaActivities";

type StatusState = {
  tone: StatusTone;
  message: string;
  links?: Array<{ label: string; href: string }>;
};

export default function DashboardApp() {
  const { healthStatus, refreshHealth } = useHealthStatus();
  const { images, refreshImages: reloadImages } = useImageList();
  const { activities, loadActivities } = useStravaActivities();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [status, setStatus] = useState<StatusState | null>(null);
  const [hideFilenames, setHideFilenames] = useState(false);
  const [imageColumns, setImageColumns] = useState(12);
  const [showRunningOnly, setShowRunningOnly] = useState(false);

  const refreshImages = useCallback(async () => {
    setLoadingAction("refresh");
    try {
      const nextImages = await reloadImages();
      setStatus({
        tone: "info",
        message: `Loaded ${nextImages.length} image(s).`,
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
  }, [reloadImages]);

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
        message: `Generated ${response.summary.successful} of ${response.summary.total} image(s).${response.summary.failed ? ` ${response.summary.failed} failed.` : ""}`,
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
        message: `Generated ${response.summary.successful} of ${response.summary.total} Strava image(s).${response.summary.failed ? ` ${response.summary.failed} failed.` : ""}${response.summary.skipped ? ` ${response.summary.skipped} skipped.` : ""}`,
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
      const response = await loadActivities();
      setStatus({
        tone: "success",
        message: `${response.message} Showing ${response.activities.length} activities.`,
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
  }, [loadActivities]);

  useEffect(() => {
    async function bootstrap() {
      await refreshHealth();
      await refreshImages();
    }

    void bootstrap();
  }, [refreshHealth, refreshImages]);

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
