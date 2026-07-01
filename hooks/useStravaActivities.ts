"use client";

import { useCallback, useState } from "react";
import { getStravaActivities } from "@/lib/api-client";
import type { StravaActivity } from "@/lib/api-types";

export function useStravaActivities() {
  const [activities, setActivities] = useState<StravaActivity[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadActivities = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await getStravaActivities();
      const nextActivities = response.activities || [];
      setActivities(nextActivities);
      return {
        message: response.message,
        activities: nextActivities,
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    activities,
    isLoading,
    loadActivities,
  };
}
