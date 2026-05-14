"use client"

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { CheckCircle2, MessageSquare, ShieldAlert } from "lucide-react";
import { mockCandidates } from "@/lib/mockData";

const competencies = ["Role fit", "Technical depth", "Communication", "Problem solving", "Culture contribution"];

export default function CandidateScorecardPage() {
    const params = useParams<{ id: string }>();
    const candidate = mockCandidates.find(item => item.id === params.id);

    if (!candidate) notFound();

    return (
        <div className="p-8 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Structured Scorecard</h1>
                    <p className="text-gray-500">{candidate.name} · {candidate.role_applied}</p>
                </div>
                <Link href={`/dashboard/candidates/${candidate.id}`} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Back to profile</Link>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Metric label="AI fit" value={`${candidate.score}/100`} />
                <Metric label="Interview" value={candidate.interview_status} />
                <Metric label="Recommendation" value={candidate.recommendation} />
            </div>

            <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-bold text-gray-900">Competency Review</h2>
                <div className="space-y-4">
                    {competencies.map((name, index) => {
                        const score = Math.max(62, candidate.score - index * 4);
                        return (
                            <div key={name}>
                                <div className="mb-1 flex justify-between text-sm"><span className="font-medium text-gray-700">{name}</span><span className="font-semibold text-gray-900">{score}</span></div>
                                <div className="h-2 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-blue-600" style={{ width: `${score}%` }} /></div>
                            </div>
                        );
                    })}
                </div>
            </section>

            <div className="grid gap-6 lg:grid-cols-2">
                <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <div className="mb-3 flex items-center gap-2 text-green-700"><CheckCircle2 size={18} /><h2 className="font-bold">Evidence</h2></div>
                    <ul className="space-y-2 text-sm text-gray-600">
                        {candidate.resume_analysis.skills_found.map(skill => <li key={skill}>Matched skill: {skill}</li>)}
                        {candidate.interview?.strengths.map(strength => <li key={strength}>Interview strength: {strength}</li>)}
                    </ul>
                </section>
                <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <div className="mb-3 flex items-center gap-2 text-yellow-700"><ShieldAlert size={18} /><h2 className="font-bold">Risks / Follow-ups</h2></div>
                    <ul className="space-y-2 text-sm text-gray-600">
                        {candidate.resume_analysis.skills_missing.map(skill => <li key={skill}>Validate gap: {skill}</li>)}
                        {candidate.interview?.weaknesses.map(weakness => <li key={weakness}>Interview concern: {weakness}</li>)}
                        <li>Recruiter override required before rejection or offer.</li>
                    </ul>
                </section>
            </div>

            <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mb-3 flex items-center gap-2 text-blue-700"><MessageSquare size={18} /><h2 className="font-bold">Decision Summary</h2></div>
                <p className="text-sm text-gray-600">{candidate.screening_summary}</p>
                <div className="mt-5 flex gap-3">
                    <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Move to next stage</button>
                    <button className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Request feedback</button>
                    <button className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Override recommendation</button>
                </div>
            </section>
        </div>
    );
}

function Metric({ label, value }: { label: string; value: string }) {
    return <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"><p className="text-sm text-gray-500">{label}</p><p className="mt-1 text-xl font-bold text-gray-900">{value}</p></div>;
}
