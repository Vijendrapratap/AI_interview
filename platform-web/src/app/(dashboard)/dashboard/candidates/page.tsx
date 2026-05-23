import { listCandidates } from "@/lib/data/candidates";
import { listJobs } from "@/lib/data/jobs";
import { CandidatesView } from "./CandidatesView";

export default async function CandidatesPage() {
  const [candidates, jobs] = await Promise.all([listCandidates(), listJobs()]);
  return <CandidatesView candidates={candidates} jobs={jobs} />;
}
