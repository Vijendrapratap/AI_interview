"use client";

import { useTransition } from "react";
import { Select } from "./Field";
import { moveStage } from "@/lib/data/applications";
import { STAGES, type Stage } from "@/lib/data/application-types";

export function StageChanger({
  applicationId,
  currentStage,
}: {
  applicationId: string;
  currentStage: Stage;
}) {
  const [isPending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as Stage;
    if (next === currentStage) return;
    startTransition(async () => {
      await moveStage(applicationId, next);
    });
  }

  return (
    <Select
      value={currentStage}
      onChange={handleChange}
      disabled={isPending}
      className="mt-2 text-[11px] py-1 px-2 h-7"
      aria-label="Move to stage"
    >
      {STAGES.map((s) => (
        <option key={s} value={s}>
          {s.charAt(0).toUpperCase() + s.slice(1)}
        </option>
      ))}
    </Select>
  );
}
