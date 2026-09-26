"use client";

import { useCallback, useState } from "react";
import { getHealth } from "@/lib/api-client";

export type HealthStatus = "checking" | "ok" | "error";

export function useHealthStatus() {
  const [healthStatus, setHealthStatus] = useState<HealthStatus>("checking");

  const refreshHealth = useCallback(async () => {
    try {
      const response = await getHealth();
      setHealthStatus(
        String(response.status).toLowerCase() === "ok" ? "ok" : "error",
      );
    } catch {
      setHealthStatus("error");
    }
  }, []);

  return {
    healthStatus,
    refreshHealth,
  };
}
