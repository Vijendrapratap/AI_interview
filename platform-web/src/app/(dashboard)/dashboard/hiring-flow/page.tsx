"use client"

import { CheckCircle2, Mail, Send, ShieldCheck, SlidersHorizontal, Sparkles } from "lucide-react";
import { recruiterFlowSteps, screeningRules, testEmailDrafts } from "@/lib/mockData";
import { Banner, Badge, Card, PageHeader } from "@/components";

export default function HiringFlowPage() {
    return (
        <div className="p-8 space-y-8">
            <PageHeader
                eyebrow="Recruiting"
                title="Hiring Flow"
                subtitle="One clean hiring checklist — post, collect, AI screen, send test, decide."
            />

            <Banner tone="neutral">
                This area is read-only for now — full functionality lands in Slice 2.
            </Banner>

            {/* Dark hero panel */}
            <div className="bg-ink text-card rounded-card p-8 shadow-card">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                    <div className="max-w-3xl">
                        <p className="mb-3 inline-flex items-center gap-2 rounded-pill bg-white/10 px-3 py-1 text-sm text-card/80">
                            <Sparkles size={16} /> Simple recruiter operating flow
                        </p>
                        <h2 className="text-3xl font-bold tracking-tight text-card">
                            Post → Collect → AI Screen → Send Test → Decide
                        </h2>
                        <p className="mt-3 text-card/70">
                            ReCruItAI should feel like one clean hiring checklist, not a complex ATS. Recruiters create one job, collect resumes from every channel, let AI score and explain fit, then approve assessment emails for qualified candidates.
                        </p>
                    </div>
                    <button className="inline-flex items-center justify-center gap-2 rounded-pill bg-accent px-5 h-10 text-[13px] font-bold text-accent-ink whitespace-nowrap shadow-sm transition hover:bg-accent-hover">
                        <Send size={16} /> Start a hiring run
                    </button>
                </div>
            </div>

            {/* Five step cards — equal height grid */}
            <section className="grid gap-4 lg:grid-cols-5 items-stretch">
                {recruiterFlowSteps.map((step) => (
                    <Card key={step.id} className="h-full flex flex-col">
                        <div className="mb-4 flex items-center justify-between">
                            <span className="flex h-9 w-9 items-center justify-center rounded-pill bg-accent text-sm font-bold text-accent-ink">
                                {step.step}
                            </span>
                            <Badge tone="neutral">{step.status}</Badge>
                        </div>
                        <h3 className="text-card-title text-ink">{step.title}</h3>
                        <p className="mt-1 text-sm text-ink-3">{step.subtitle}</p>
                        <p className="mt-4 text-metric text-ink">{step.metric}</p>
                        <p className="mt-3 text-sm text-ink-2">{step.detail}</p>
                        <p className="mt-4 rounded-tile bg-accent-soft p-3 text-sm font-medium text-accent-soft-ink">
                            Next: {step.action}
                        </p>
                    </Card>
                ))}
            </section>

            {/* Screening rules + assessment emails */}
            <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
                {/* Screening rules */}
                <Card>
                    <div className="mb-5 flex items-center gap-3">
                        <div className="rounded-tile bg-success-soft p-2 text-success-soft-ink">
                            <SlidersHorizontal size={20} />
                        </div>
                        <div>
                            <h2 className="text-card-title text-ink">Screening rules recruiters can understand</h2>
                            <p className="text-sm text-ink-3">Simple thresholds turn resume parsing into clear actions.</p>
                        </div>
                    </div>
                    <div className="space-y-3">
                        {screeningRules.map(rule => (
                            <div key={rule.label} className="rounded-tile border border-border-card p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <p className="font-semibold text-ink">{rule.label}</p>
                                    <span className="rounded-pill bg-ink px-3 py-1 text-xs font-semibold text-card">{rule.threshold}</span>
                                </div>
                                <p className="mt-2 text-sm text-ink-2">{rule.action}</p>
                                <p className="mt-2 flex items-center gap-2 text-xs font-medium text-success-soft-ink">
                                    <ShieldCheck size={14} /> {rule.guardrail}
                                </p>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* Assessment emails */}
                <Card>
                    <div className="mb-5 flex items-center gap-3">
                        <div className="rounded-tile bg-accent-soft p-2 text-accent-soft-ink">
                            <Mail size={20} />
                        </div>
                        <div>
                            <h2 className="text-card-title text-ink">Assessment emails ready for approval</h2>
                            <p className="text-sm text-ink-3">Qualified candidates get the next step without recruiter admin work.</p>
                        </div>
                    </div>
                    <div className="space-y-3">
                        {testEmailDrafts.map(draft => (
                            <div key={draft.candidate} className="rounded-tile border border-border-card p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="font-semibold text-ink">{draft.candidate}</p>
                                        <p className="text-sm text-ink-3">{draft.role}</p>
                                    </div>
                                    <Badge tone="accent">AI {draft.score}</Badge>
                                </div>
                                <p className="mt-3 text-sm text-ink-2"><span className="font-medium text-ink">Test:</span> {draft.test}</p>
                                <p className="mt-1 text-sm text-ink-2"><span className="font-medium text-ink">Email:</span> {draft.subject}</p>
                                <div className="mt-4 flex items-center justify-between">
                                    <span className="flex items-center gap-1 text-xs font-medium text-ink-3">
                                        <CheckCircle2 size={14} /> {draft.status}
                                    </span>
                                    <button className="rounded-tile bg-accent px-3 py-2 text-sm font-semibold text-accent-ink hover:bg-accent-hover transition">
                                        Approve send
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            </section>
        </div>
    );
}
