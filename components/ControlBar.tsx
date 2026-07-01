type ControlBarProps = {
  hideFilenames: boolean;
  imageColumns: number;
  loadingAction: string | null;
  onRefresh: () => void;
  onGenerateFromFiles: () => void;
  onGenerateFromStrava: () => void;
  onStitch: () => void;
  onLoadStrava: () => void;
  onToggleFilenames: (checked: boolean) => void;
  onImageColumnsChange: (nextValue: number) => void;
};

export default function ControlBar({
  hideFilenames,
  imageColumns,
  loadingAction,
  onRefresh,
  onGenerateFromFiles,
  onGenerateFromStrava,
  onStitch,
  onLoadStrava,
  onToggleFilenames,
  onImageColumnsChange,
}: ControlBarProps) {
  const busy = Boolean(loadingAction);

  return (
    <div className="control-bar">
      <button type="button" onClick={onRefresh} disabled={busy}>
        Refresh
      </button>
      <button type="button" onClick={onGenerateFromFiles} disabled={busy}>
        GPX/TCX
      </button>
      <button type="button" onClick={onGenerateFromStrava} disabled={busy}>
        Strava
      </button>
      <button type="button" onClick={onStitch} disabled={busy}>
        Stitch
      </button>
      <button type="button" onClick={onLoadStrava} disabled={busy}>
        Load Strava
      </button>

      <label className="inline-control">
        <input
          type="checkbox"
          checked={hideFilenames}
          onChange={(event) => onToggleFilenames(event.target.checked)}
        />
        Hide filenames
      </label>

      <label className="inline-control" htmlFor="image-cols">
        Cols: <span>{imageColumns}</span>
        <input
          id="image-cols"
          type="range"
          min={1}
          max={12}
          step={1}
          value={imageColumns}
          onChange={(event) => onImageColumnsChange(Number(event.target.value))}
        />
      </label>
    </div>
  );
}
