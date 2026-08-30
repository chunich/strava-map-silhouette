"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { uploadAndProcessFiles } from "@/lib/api-client";
import type { GenerateImagesResponse } from "@/lib/api-types";

const ACCEPTED_EXTENSIONS = [".gpx", ".tcx", ".fit"];

function hasValidExtension(file: File): boolean {
  const lower = file.name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

type DropZoneProps = {
  disabled: boolean;
  onProcessed: (response: GenerateImagesResponse) => void;
  onError: (message: string) => void;
};

export default function DropZone({
  disabled,
  onProcessed,
  onError,
}: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const dragCounter = useRef(0);

  useEffect(() => {
    function onDragEnter(event: DragEvent) {
      event.preventDefault();
      dragCounter.current += 1;
      if (dragCounter.current === 1) setIsDragging(true);
    }

    function onDragOver(event: DragEvent) {
      event.preventDefault();
    }

    function onDragLeave(event: DragEvent) {
      event.preventDefault();
      dragCounter.current -= 1;
      if (dragCounter.current === 0) setIsDragging(false);
    }

    function onDrop(event: DragEvent) {
      event.preventDefault();
      dragCounter.current = 0;
      setIsDragging(false);
    }

    window.addEventListener("dragenter", onDragEnter);
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("drop", onDrop);

    return () => {
      window.removeEventListener("dragenter", onDragEnter);
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("drop", onDrop);
    };
  }, []);

  const processFiles = useCallback(
    async (files: File[]) => {
      const valid = files.filter(hasValidExtension);
      if (valid.length === 0) {
        onError(`No valid files. Accepted: ${ACCEPTED_EXTENSIONS.join(", ")}`);
        return;
      }

      setIsUploading(true);
      try {
        const response = await uploadAndProcessFiles(valid);
        onProcessed(response);
      } catch (error) {
        onError(error instanceof Error ? error.message : "Upload failed");
      } finally {
        setIsUploading(false);
      }
    },
    [onProcessed, onError],
  );

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (disabled || isUploading) return;
    const files = Array.from(event.dataTransfer.files);
    void processFiles(files);
  }

  function handleDragOver(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
  }

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    if (!event.target.files) return;
    const files = Array.from(event.target.files);
    void processFiles(files);
    // Reset so the same file can be re-dropped
    event.target.value = "";
  }

  const busy = disabled || isUploading;

  return (
    <div
      className={`drop-zone${isDragging ? " dragging" : ""}${isUploading ? " uploading" : ""}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      aria-label="Drop activity files to process"
    >
      {isUploading ? (
        <span className="drop-zone-label">
          <span className="drop-zone-spinner" aria-hidden="true" />
          Processing…
        </span>
      ) : (
        <>
          <span className="drop-zone-label">
            {isDragging
              ? "Release to process"
              : "Drop .gpx / .tcx / .fit to process"}
          </span>
          <label className={`drop-zone-browse${busy ? " disabled" : ""}`}>
            or browse
            <input
              type="file"
              accept=".gpx,.tcx,.fit"
              multiple
              disabled={busy}
              onChange={handleInputChange}
              style={{ display: "none" }}
            />
          </label>
        </>
      )}
    </div>
  );
}
