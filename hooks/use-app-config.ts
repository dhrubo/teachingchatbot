// hooks/use-app-config.ts
// Client hook that fetches server config via SWR. Cached for 1 minute.

"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/utils";

export type AppConfigResponse = {
  mode: "FREE" | "PREMIUM";
  isGuest: boolean;
  questionLimit: number | null;
  questionsUsed: number;
  retentionHours: number | null;
};

export function useAppConfig() {
  const { data, error, isLoading } = useSWR<AppConfigResponse>(
    "/api/app/config",
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60_000,
    }
  );

  return {
    config: data,
    isLoading,
    error,
  };
}
