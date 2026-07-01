type ImageGalleryProps = {
  images: string[];
  hideFilenames: boolean;
  imageColumns: number;
  isLoading?: boolean;
  error?: string | null;
};

export default function ImageGallery({
  images,
  hideFilenames,
  imageColumns,
  isLoading = false,
  error = null,
}: ImageGalleryProps) {
  if (isLoading) {
    return <p className="empty-state loading-pulse">Loading images...</p>;
  }

  if (error) {
    return <p className="empty-state section-error">{error}</p>;
  }

  if (images.length === 0) {
    return (
      <p className="empty-state">
        No images generated yet. Use GPX/TCX or Strava to generate.
      </p>
    );
  }

  return (
    <div
      className="image-grid"
      style={{
        gridTemplateColumns: `repeat(${imageColumns}, minmax(0, 1fr))`,
      }}
    >
      {images.map((filename) => (
        <div key={filename} className="image-card">
          <a
            href={`/api/images/${encodeURIComponent(filename)}`}
            target="_blank"
            rel="noreferrer"
            aria-label={`Open ${filename}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/images/${encodeURIComponent(filename)}`}
              alt={filename}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.opacity = "0.3";
                (e.currentTarget as HTMLImageElement).alt =
                  `Failed to load: ${filename}`;
              }}
            />
          </a>
          {!hideFilenames ? <div className="filename">{filename}</div> : null}
        </div>
      ))}
    </div>
  );
}
