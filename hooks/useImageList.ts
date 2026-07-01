"use client";

import { useCallback, useState } from "react";
import { listImages } from "@/lib/api-client";

export function useImageList() {
  const [images, setImages] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshImages = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const response = await listImages();
      setImages(response.images || []);
      return response.images || [];
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  return {
    images,
    isRefreshing,
    refreshImages,
  };
}
