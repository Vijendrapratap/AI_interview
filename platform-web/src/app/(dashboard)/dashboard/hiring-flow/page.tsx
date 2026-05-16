"use client"

import { CheckCircle2, Mail, Send, ShieldCheck, SlidersHorizontal, Sparkles } from "lucide-react";
import { recruiterFlowSteps, screeningRules, testEmailDrafts } from "@/lib/mockData";

export default function HiringFlowPage() {
    return (
        <div className="p-8 space-y-8">
            <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-8 text-white shadow-sm">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                    <div className="max-w-3xl">
                        <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm text-blue-100">
                            <Sparkles size={16} /> Simple recruiter operating flow
                        </p>
                        <h1 className="text-3xl font-bold tracking-tight">Post → Collect → AI Screen → Send Test → Decide</h1>
                        <p className="mt-3 text-blue-100">
                            ReCruItAI should feel like one clean hiring checklist, not a complex ATS. Recruiters create one job, collect resumes from every channel, let AI score and explain fit, then approve assessment emails for qualified candidates.
                        </p>
                    </div>
                    <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 font-semibold text-slate-950 shadow-sm transition hover:bg-blue-50">
                        <Send size={18} /> Start a hiring run
                    </button>
                </div>
            </div>

            <section className="grid gap-4 lg:grid-cols-5">
                {recruiterFlowSteps.map((step) => (
                    <div key={step.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                        <div className="mb-4 flex items-center justify-between">
                            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">{step.step}</span>
                            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">{step.status}</span>
                        </div>
                        <h2 className="font-bold text-gray-900">{step.title}</h2>
                        <p className="mt-1 text-sm text-gray-500">{step.subtitle}</p>
                        <p className="mt-4 text-2xl font-bold text-gray-900">{step.metric}</p>
                        <p className="mt-3 text-sm text-gray-600">{step.detail}</p>
                        <p className="mt-4 rounded-lg bg-blue-50 p-3 text-sm font-medium text-blue-800">Next: {step.action}</p>
                    </div>
                ))}
            </section>

            <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <div className="mb-5 flex items-center gap-3">
                        <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700"><SlidersHorizontal size={20} /></div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Screening rules recruiters can understand</h2>
                            <p className="text-sm text-gray-500">Simple thresholds turn resume parsing into clear actions.</p>
                        </div>
                    </div>
                    <div className="space-y-3">
                        {screeningRules.map(rule => (
                            <div key={rule.label} className="rounded-lg border border-gray-100 p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <p className="font-semibold text-gray-900">{rule.label}</p>
                                    <span className="rounded-full bg-gray-900 px-3 py-1 text-xs font-semibold text-white">{rule.threshold}</span>
                                </div>
                                <p className="mt-2 text-sm text-gray-600">{rule.action}</p>
                                <p className="mt-2 flex items-center gap-2 text-xs font-medium text-emerald-700"><ShieldCheck size={14} /> {rule.guardrail}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <div className="mb-5 flex items-center gap-3">
                        <div className="rounded-lg bg-blue-50 p-2 text-blue-700"><Mail size={20} /></div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Assessment emails ready for approval</h2>
                            <p className="text-sm text-gray-500">Qualified candidates get the next step without recruiter admin work.</p>
                        </div>
                    </div>
                    <div className="space-y-3">
                        {testEmailDrafts.map(draft => (
                            <div key={draft.candidate} className="rounded-lg border border-gray-100 p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="font-semibold text-gray-900">{draft.candidate}</p>
                                        <p className="text-sm text-gray-500">{draft.role}</p>
                                    </div>
                                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">AI {draft.score}</span>
                                </div>
                                <p className="mt-3 text-sm text-gray-700"><span className="font-medium">Test:</span> {draft.test}</p>
                                <p className="mt-1 text-sm text-gray-700"><span className="font-medium">Email:</span> {draft.subject}</p>
                                <div className="mt-4 flex items-center justify-between">
                                    <span className="flex items-center gap-1 text-xs font-medium text-gray-500"><CheckCircle2 size={14} /> {draft.status}</span>
                                    <button className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700">Approve send</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
}
