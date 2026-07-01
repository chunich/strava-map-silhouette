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
import { isRunningActivity } from "@/lib/activity-format";
import type { StatusTone } from "@/lib/api-types";
import { useHealthStatus } from "@/hooks/useHealthStatus";
import { useImageList } from "@/hooks/useImageList";
import { useStravaActivities } from "@/hooks/useStravaActivities";

type StatusState = {
  tone: StatusTone;
  message: string;
  links?: Array<{ label: string; href: string }>;
};

type OpenSection = "images" | "activities" | null;

export default function DashboardApp() {
  const { healthStatus, refreshHealth } = useHealthStatus();
  const {
    images,
    isRefreshing: imagesLoading,
    refreshImages: reloadImages,
  } = useImageList();
  const {
    activities,
    isLoading: activitiesLoading,
    loadActivities,
  } = useStravaActivities();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [status, setStatus] = useState<StatusState | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [activitiesError, setActivitiesError] = useState<string | null>(null);
  const [hideFilenames, setHideFilenames] = useState(false);
  const [imageColumns, setImageColumns] = useState(12);
  const [showRunningOnly, setShowRunningOnly] = useState(false);
  const [openSection, setOpenSection] = useState<OpenSection>("images");
  const visibleActivityCount = showRunningOnly
    ? activities.filter((activity) => isRunningActivity(activity)).length
    : activities.length;

  const toggleSection = useCallback((section: Exclude<OpenSection, null>) => {
    setOpenSection((current) => (current === section ? null : section));
  }, []);

  const refreshImages = useCallback(async () => {
    setOpenSection("images");
    setLoadingAction("refresh");
    setImageError(null);
    try {
      const nextImages = await reloadImages();
      setStatus({
        tone: "info",
        message: `Loaded ${nextImages.length} image(s).`,
      });
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Failed to load images";
      setImageError(msg);
      setStatus({ tone: "error", message: msg });
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
    setActivitiesError(null);
    try {
      const response = await loadActivities();
      setOpenSection("activities");
      setStatus({
        tone: "success",
        message: `${response.message} Showing ${response.activities.length} activities.`,
      });
    } catch (error) {
      const msg =
        error instanceof Error
          ? error.message
          : "Failed to load Strava activities";
      setActivitiesError(msg);
      setStatus({ tone: "error", message: msg });
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
          onDismiss={() => setStatus(null)}
        />
      ) : null}

      <section className="dashboard-section">
        <h2 className="accordion-heading">
          <button
            type="button"
            className="accordion-toggle"
            aria-expanded={openSection === "images"}
            aria-controls="images-panel"
            onClick={() => toggleSection("images")}
          >
            <span>
              Generated Images{images.length > 0 ? ` (${images.length})` : ""}
            </span>
            <span className="accordion-icon" aria-hidden="true">
              {openSection === "images" ? "-" : "+"}
            </span>
          </button>
        </h2>
        <div
          id="images-panel"
          className={`accordion-panel ${openSection === "images" ? "expanded" : "collapsed"}`}
          aria-hidden={openSection !== "images"}
        >
          <div className="accordion-panel-content">
            <ImageGallery
              images={images}
              hideFilenames={hideFilenames}
              imageColumns={imageColumns}
              isLoading={imagesLoading}
              error={imageError}
            />
          </div>
        </div>
      </section>

      <section className="dashboard-section">
        <h2 className="accordion-heading">
          <button
            type="button"
            className="accordion-toggle"
            aria-expanded={openSection === "activities"}
            aria-controls="activities-panel"
            onClick={() => toggleSection("activities")}
          >
            <span>Strava Activities ({visibleActivityCount})</span>
            <span className="accordion-icon" aria-hidden="true">
              {openSection === "activities" ? "-" : "+"}
            </span>
          </button>
        </h2>
        <div
          id="activities-panel"
          className={`accordion-panel ${openSection === "activities" ? "expanded" : "collapsed"}`}
          aria-hidden={openSection !== "activities"}
        >
          <div className="accordion-panel-content">
            <StravaActivityList
              activities={activities}
              showRunningOnly={showRunningOnly}
              onToggleRunningOnly={setShowRunningOnly}
              isLoading={activitiesLoading}
              error={activitiesError}
            />
          </div>
        </div>
      </section>
    </main>
  );
}
