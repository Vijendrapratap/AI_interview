"use client"

import Link from "next/link";
import { CalendarClock, Copy, Sparkles } from "lucide-react";
import { mockCandidates } from "@/lib/mockData";

export default function InterviewsPage() {
    const interviewCandidates = mockCandidates.filter(candidate => candidate.status !== "Rejected");

    return (
        <div className="p-8 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">AI Interview Center</h1>
                    <p className="text-gray-500">Invite candidates, monitor completion, and review structured AI interview results.</p>
                </div>
                <div className="rounded-full bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700">Structured interview kits enabled</div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Metric label="Invites to send" value={interviewCandidates.filter(c => c.interview_status === "Not Invited").length.toString()} />
                <Metric label="Awaiting review" value={interviewCandidates.filter(c => c.interview_status === "Needs Review").length.toString()} />
                <Metric label="Completed" value={interviewCandidates.filter(c => c.interview_status === "Completed").length.toString()} />
            </div>

            <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="border-b border-gray-100 p-6">
                    <h2 className="text-lg font-bold text-gray-900">Interview Queue</h2>
                    <p className="text-sm text-gray-500">Every interview maps questions to role competencies and recruiter scorecards.</p>
                </div>
                <div className="divide-y divide-gray-100">
                    {interviewCandidates.map(candidate => (
                        <div key={candidate.id} className="grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-center">
                            <div className="flex items-start gap-4">
                                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-indigo-50 text-indigo-700"><CalendarClock size={20} /></div>
                                <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <p className="font-semibold text-gray-900">{candidate.name}</p>
                                        <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">{candidate.interview_status}</span>
                                    </div>
                                    <p className="text-sm text-gray-500">{candidate.role_applied}</p>
                                    <p className="mt-2 text-sm text-gray-700">{candidate.interview ? candidate.interview.transcript_snippet : "Generate adaptive role-specific questions and send the candidate link."}</p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => navigator.clipboard.writeText(`${window.location.origin}/interview/${candidate.id}`)}
                                    className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                                >
                                    <Copy size={16} /> Copy link
                                </button>
                                <Link href={`/dashboard/candidates/${candidate.id}/scorecard`} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">
                                    <Sparkles size={16} /> Review
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}

function Metric({ label, value }: { label: string; value: string }) {
    return <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"><p className="text-sm text-gray-500">{label}</p><p className="mt-1 text-3xl font-bold text-gray-900">{value}</p></div>;
}
