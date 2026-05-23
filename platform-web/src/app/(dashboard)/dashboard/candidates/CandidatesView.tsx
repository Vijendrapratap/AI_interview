"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowUpDown, Loader2, Plus, Search, Share2, ShieldAlert, Users, X } from "lucide-react";
import {
  PageHeader,
  Badge,
  Avatar,
  Button,
  FilterChips,
  EmptyState,
  StatCard,
  TableWrap,
  THead,
  TBody,
  TR,
  Th,
  Td,
  Label,
  Input,
  Select,
} from "@/components";
import { AnalysisStatus } from "@/components/AnalysisStatus";
import { addCandidateWithResume } from "@/lib/data/resumes";

type Application = {
  id: string;
  stage: string | null;
  ai_score: number | null;
  analysis_status: string | null;
  job_id: string | null;
  jobs: { title: string } | null;
};

type Candidate = {
  id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  current_role?: string | null;
  current_company?: string | null;
  source?: string | null;
  created_at: string;
  applications?: Application[];
};

type Job = {
  id: string;
  title: string;
  status: string;
};

function stageTone(s: string | null): "success" | "warning" | "danger" | "neutral" | "accent" {
  if (!s) return "neutral";
  if (s === "offer" || s === "hired") return "success";
  if (s === "rejected") return "danger";
  if (s === "interview") return "accent";
  if (s === "screening") return "warning";
  return "neutral";
}

export function CandidatesView({
  candidates,
  jobs,
}: {
  candidates: Candidate[];
  jobs: Job[];
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("All");
  const [showAddForm, setShowAddForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const stages = ["All", "new", "screening", "interview", "offer", "rejected"];
  const stageLabels: Record<string, string> = {
    All: "All",
    new: "New",
    screening: "Screening",
    interview: "Interview",
    offer: "Offer",
    rejected: "Rejected",
  };

  const filteredCandidates = candidates.filter((candidate) => {
    const firstApp = candidate.applications?.[0];
    const searchable = [
      candidate.full_name,
      candidate.email,
      candidate.current_role ?? "",
      candidate.current_company ?? "",
      candidate.source ?? "",
      firstApp?.jobs?.title ?? "",
    ]
      .join(" ")
      .toLowerCase();

    const matchesSearch = searchable.includes(searchQuery.toLowerCase());
    const matchesStage =
      stageFilter === "All" || firstApp?.stage === stageFilter;

    return matchesSearch && matchesStage;
  });

  const stageChips = stages.map((s) => ({
    label: stageLabels[s],
    count:
      s === "All"
        ? candidates.length
        : candidates.filter((c) => c.applications?.[0]?.stage === s).length,
  }));

  // Stats
  const activeCount = candidates.filter(
    (c) => c.applications?.[0]?.stage !== "rejected"
  ).length;
  const highFit = candidates.filter(
    (c) =>
      (c.applications?.[0]?.ai_score ?? 0) >= 85 &&
      c.applications?.[0]?.stage !== "rejected"
  ).length;
  const screeningCount = candidates.filter(
    (c) =>
      c.applications?.[0]?.analysis_status === "pending" ||
      c.applications?.[0]?.analysis_status === "processing"
  ).length;

  async function handleAddCandidate(formData: FormData) {
    setFormError(null);
    startTransition(async () => {
      try {
        await addCandidateWithResume(formData);
        setShowAddForm(false);
      } catch (err) {
        setFormError(err instanceof Error ? err.message : "Failed to add candidate");
      }
    });
  }

  return (
    <div className="space-y-8 p-8">
      <PageHeader
        eyebrow="Hiring"
        title="Candidate Pipeline"
        subtitle="Screen, prioritize, and move candidates without leaving the recruiter workspace."
        actions={
          <>
            <Button
              variant="secondary"
              size="md"
              onClick={() => setShowAddForm((v) => !v)}
            >
              {showAddForm ? (
                <>
                  <X size={16} /> Cancel
                </>
              ) : (
                <>
                  <Plus size={16} /> Add Candidate
                </>
              )}
            </Button>
          </>
        }
      />

      {/* Add Candidate inline form */}
      {showAddForm && (
        <div className="rounded-card border border-border-card bg-card p-6 shadow-card">
          <h3 className="text-card-title mb-4">Add a new candidate</h3>
          <form action={handleAddCandidate} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label required>Full name</Label>
                <Input name="full_name" placeholder="Jane Smith" required />
              </div>
              <div>
                <Label required>Email</Label>
                <Input name="email" type="email" placeholder="jane@example.com" required />
              </div>
              <div>
                <Label>Phone</Label>
                <Input name="phone" type="tel" placeholder="+1 555 000 0000" />
              </div>
              <div>
                <Label>Current role</Label>
                <Input name="current_role" placeholder="Senior Engineer" />
              </div>
              <div>
                <Label>Current company</Label>
                <Input name="current_company" placeholder="Acme Inc." />
              </div>
              <div>
                <Label required>Applying for</Label>
                <Select name="job_id" required defaultValue="">
                  <option value="" disabled>
                    Select a job…
                  </option>
                  {jobs
                    .filter((j) => j.status === "open")
                    .map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.title}
                      </option>
                    ))}
                </Select>
              </div>
            </div>
            <div>
              <Label required>Resume (PDF / DOCX)</Label>
              <Input name="resume" type="file" accept=".pdf,.doc,.docx" required />
            </div>
            {formError && (
              <p className="text-sm font-medium text-danger">{formError}</p>
            )}
            <div className="flex items-center gap-3">
              <Button type="submit" variant="primary" size="md" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Uploading…
                  </>
                ) : (
                  "Submit & start screening"
                )}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => setShowAddForm(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          icon={<Users size={18} />}
          value={activeCount.toString()}
          label="Active candidates"
          chip="In pipeline"
          tone="warning"
        />
        <StatCard
          icon={<Users size={18} />}
          value={highFit.toString()}
          label="High-fit candidates"
          chip="85+ AI score"
          tone="success"
        />
        <StatCard
          icon={<ShieldAlert size={18} />}
          value={screeningCount.toString()}
          label="AI screening now"
          chip="Pending / processing"
          tone="neutral"
        />
        <StatCard
          icon={<Users size={18} />}
          value={candidates.length.toString()}
          label="Total candidates"
          chip="All stages"
          tone="neutral"
        />
      </div>

      {/* Search + filters */}
      <div className="rounded-card border border-border-card bg-card p-4 shadow-card">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative w-full xl:w-[34rem]">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3"
              size={18}
            />
            <input
              type="text"
              placeholder="Search candidate, role, company, source…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-card border border-border bg-surface py-2 pl-10 pr-4 text-sm text-ink transition-shadow placeholder:text-ink-3 focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <FilterChips
            chips={stageChips}
            active={stageLabels[stageFilter] ?? stageFilter}
            onChange={(label) => {
              const found = stages.find((s) => stageLabels[s] === label);
              setStageFilter(found ?? "All");
            }}
          />
        </div>
      </div>

      {/* Table */}
      <TableWrap>
        <THead>
          <TR>
            <Th className="sticky left-0 bg-surface">Candidate</Th>
            <Th>Job</Th>
            <Th>Stage</Th>
            <Th>
              <span className="inline-flex items-center gap-1">
                AI Fit <ArrowUpDown size={12} />
              </span>
            </Th>
            <Th>Source</Th>
            <Th>Action</Th>
          </TR>
        </THead>
        <TBody>
          {filteredCandidates.length > 0 ? (
            filteredCandidates.map((candidate) => {
              const firstApp = candidate.applications?.[0];
              const initials = candidate.full_name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();

              return (
                <TR key={candidate.id}>
                  <Td className="sticky left-0 bg-card">
                    <div className="flex items-center gap-3">
                      <Avatar initials={initials} size="md" />
                      <div>
                        <Link
                          href={`/dashboard/candidates/${candidate.id}`}
                          className="font-medium text-ink hover:text-accent hover:underline"
                        >
                          {candidate.full_name}
                        </Link>
                        <p className="text-xs text-ink-3">{candidate.email}</p>
                        {candidate.current_role && (
                          <p className="mt-0.5 text-xs text-ink-3">
                            {candidate.current_role}
                            {candidate.current_company
                              ? ` · ${candidate.current_company}`
                              : ""}
                          </p>
                        )}
                      </div>
                    </div>
                  </Td>
                  <Td>
                    {firstApp?.jobs?.title ? (
                      <p className="font-medium text-ink">{firstApp.jobs.title}</p>
                    ) : (
                      <p className="text-sm text-ink-3">—</p>
                    )}
                  </Td>
                  <Td>
                    {firstApp ? (
                      <Badge tone={stageTone(firstApp.stage)}>
                        {firstApp.stage ?? "—"}
                      </Badge>
                    ) : (
                      <span className="text-sm text-ink-3">—</span>
                    )}
                  </Td>
                  <Td>
                    {firstApp ? (
                      <AnalysisStatus
                        applicationId={firstApp.id}
                        initialStatus={
                          (firstApp.analysis_status as "pending" | "processing" | "complete" | "failed") ?? "pending"
                        }
                        initialScore={firstApp.ai_score}
                      />
                    ) : (
                      <span className="text-sm text-ink-3">—</span>
                    )}
                  </Td>
                  <Td className="text-ink-2">{candidate.source ?? "—"}</Td>
                  <Td>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          void navigator.clipboard.writeText(
                            `${window.location.origin}/interview/${candidate.id}`
                          );
                          alert("Interview link copied to clipboard!");
                        }}
                        className="text-ink-3 transition-colors hover:text-accent"
                        title="Copy Interview Link"
                      >
                        <Share2 size={18} />
                      </button>
                      <Link
                        href={`/dashboard/candidates/${candidate.id}`}
                        className="text-sm font-medium text-accent hover:underline"
                      >
                        Review
                      </Link>
                    </div>
                  </Td>
                </TR>
              );
            })
          ) : (
            <TR>
              <td colSpan={6} className="py-2">
                <EmptyState
                  icon={<Users size={24} />}
                  title="No candidates found"
                  description="No candidates match your current filters. Try adjusting the search or filter chips above."
                />
              </td>
            </TR>
          )}
        </TBody>
      </TableWrap>

      <div className="flex items-center justify-between text-sm text-ink-3">
        <span>Showing {filteredCandidates.length} results</span>
        <span>
          AI scores are explainable recommendations; recruiter owns final
          decisions.
        </span>
      </div>
    </div>
  );
}
