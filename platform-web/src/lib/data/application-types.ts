// Shared constants and types for applications — no "use server" so they can be
// imported freely from both Server Actions and client components.

export type Stage = "new" | "screening" | "interview" | "offer" | "hired" | "rejected";

export const STAGES: Stage[] = ["new", "screening", "interview", "offer", "hired", "rejected"];
