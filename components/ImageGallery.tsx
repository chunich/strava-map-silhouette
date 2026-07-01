type ImageGalleryProps = {
  images: string[];
  hideFilenames: boolean;
  imageColumns: number;
};

export default function ImageGallery({
  images,
  hideFilenames,
  imageColumns,
}: ImageGalleryProps) {
  if (images.length === 0) {
    return <p className="empty-state">No SVG files found.</p>;
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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/images/${encodeURIComponent(filename)}`}
            alt={filename}
          />
          {!hideFilenames ? <div className="filename">{filename}</div> : null}
        </div>
      ))}
    </div>
  );
}
