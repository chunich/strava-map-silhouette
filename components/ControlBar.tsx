type ControlBarProps = {
  healthStatus: "checking" | "ok" | "error";
  loadingAction: string | null;
  writeActionsEnabled: boolean;
  onRefresh: () => void;
  onRefreshMetadata: () => void;
  onGenerateFromFiles: () => void;
  onGenerateFromStrava: () => void;
  onStitch: () => void;
  onLoadStrava: () => void;
};

export default function ControlBar({
  healthStatus,
  loadingAction,
  writeActionsEnabled,
  onRefresh,
  onRefreshMetadata,
  onGenerateFromFiles,
  onGenerateFromStrava,
  onStitch,
  onLoadStrava,
}: ControlBarProps) {
  const healthText =
    healthStatus === "ok"
      ? "API: OK"
      : healthStatus === "error"
        ? "API: Error"
        : "API: Checking...";
  const busy = Boolean(loadingAction);
  const refreshStatsLabel =
    loadingAction === "refresh-stats" ? "Refreshing..." : "Refresh Stats";
  const refreshLabel =
    loadingAction === "refresh" ? "Refreshing..." : "Refresh";
  const gpxLabel = loadingAction === "gpx" ? "Generating..." : "GPX/TCX/FIT";
  const stravaLabel = loadingAction === "strava" ? "Generating..." : "Strava";
  const stitchLabel = loadingAction === "stitch" ? "Stitching..." : "Stitch";
  const loadStravaLabel =
    loadingAction === "load-strava" ? "Loading..." : "Load Strava";

  return (
    <div className="control-bar" aria-busy={busy}>
      <button type="button" onClick={onRefresh} disabled={busy}>
        {refreshLabel}
      </button>
      {writeActionsEnabled && (
        <>
          <button type="button" onClick={onRefreshMetadata} disabled={busy}>
            {refreshStatsLabel}
          </button>
          <button type="button" onClick={onGenerateFromFiles} disabled={busy}>
            {gpxLabel}
          </button>
          <button type="button" onClick={onGenerateFromStrava} disabled={busy}>
            {stravaLabel}
          </button>
          <button type="button" onClick={onStitch} disabled={busy}>
            {stitchLabel}
          </button>
        </>
      )}
      <button type="button" onClick={onLoadStrava} disabled={busy}>
        {loadStravaLabel}
      </button>

      {!writeActionsEnabled && (
        <span className="control-bar-readonly-note">Read-only mode</span>
      )}

      <div className={`health-label health-${healthStatus} control-bar-health`}>
        {healthText}
      </div>
    </div>
  );
}
