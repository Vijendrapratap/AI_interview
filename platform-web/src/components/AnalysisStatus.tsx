"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "./Badge";

type Status = "pending" | "processing" | "complete" | "failed";

export function AnalysisStatus({
  applicationId,
  initialStatus,
  initialScore,
}: {
  applicationId: string;
  initialStatus: Status;
  initialScore: number | null;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>(initialStatus);
  const [score, setScore] = useState<number | null>(initialScore);

  useEffect(() => {
    if (status === "complete" || status === "failed") return;
    const supabase = createClient();
    const channel = supabase
      .channel(`app-${applicationId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "applications",
          filter: `id=eq.${applicationId}`,
        },
        (payload) => {
          const next = payload.new as {
            analysis_status: Status;
            ai_score: number | null;
          };
          setStatus(next.analysis_status);
          setScore(next.ai_score);
          if (
            next.analysis_status === "complete" ||
            next.analysis_status === "failed"
          ) {
            router.refresh();
          }
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [applicationId, status, router]);

  if (status === "pending" || status === "processing") {
    return <Badge tone="neutral">AI screening&hellip;</Badge>;
  }
  if (status === "failed") {
    return <Badge tone="danger">Screening failed</Badge>;
  }
  return (
    <Badge
      tone={
        score != null && score >= 75
          ? "success"
          : score != null && score >= 50
            ? "warning"
            : "neutral"
      }
    >
      {score != null ? `${Math.round(score)} AI fit` : "Scored"}
    </Badge>
  );
}
