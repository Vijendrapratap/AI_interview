"use client"

import { Bot, MailCheck, ShieldCheck, Zap } from "lucide-react";
import { mockAutomations, screeningRules, testEmailDrafts } from "@/lib/mockData";
import { PageHeader, Card, SectionCard, Badge, Button, PreviewBanner } from "@/components";

export default function AutomationsPage() {
    return (
        <div className="p-8 space-y-8">
            <PreviewBanner />
            <PageHeader
                eyebrow="Recruiter Tools"
                title="Recruiter Copilot Automations"
                subtitle="AI assists the workflow, but recruiter approval stays in the loop for high-impact decisions."
            />

            <div className="grid gap-4 md:grid-cols-3">
                <Summary icon={<Bot />} label="Copilot workflows" value="4" />
                <Summary icon={<ShieldCheck />} label="Human approvals" value="Required" />
                <Summary icon={<Zap />} label="Admin hours saved" value="11h/wk" />
            </div>

            <SectionCard
                title="Resume score → test email rule"
                subtitle="This converts incoming resumes into a clear recruiter approval queue."
                action={<Badge tone="accent">Default pass score: 75</Badge>}
            >
                <div className="grid gap-3 lg:grid-cols-3">
                    {screeningRules.map(rule => (
                        <Card key={rule.label} variant="compact">
                            <p className="text-eyebrow">{rule.threshold}</p>
                            <h3 className="mt-1 text-card-title">{rule.label}</h3>
                            <p className="mt-2 text-meta">{rule.action}</p>
                            <p className="mt-3 text-[12px] font-medium text-success-soft-ink">{rule.guardrail}</p>
                        </Card>
                    ))}
                </div>
            </SectionCard>

            <Card variant="flush">
                <div className="flex items-center gap-3 border-b border-border-card px-5 py-4">
                    <div className="rounded-card bg-accent-soft p-2 text-accent-soft-ink"><MailCheck size={20} /></div>
                    <div>
                        <h2 className="text-card-title">Test emails waiting for recruiter approval</h2>
                        <p className="text-meta mt-0.5">The platform drafts the next step; recruiters approve before anything goes out.</p>
                    </div>
                </div>
                <div className="divide-y divide-border-card px-5">
                    {testEmailDrafts.map(draft => (
                        <div key={draft.candidate} className="grid gap-3 py-4 md:grid-cols-[1fr_1fr_auto] md:items-center">
                            <div>
                                <p className="font-semibold text-ink">{draft.candidate}</p>
                                <p className="text-meta">{draft.role} · AI score {draft.score}</p>
                            </div>
                            <div>
                                <p className="text-[13px] font-medium text-ink">{draft.subject}</p>
                                <p className="text-meta">{draft.test}</p>
                            </div>
                            <Button variant="primary" size="sm">Approve send</Button>
                        </div>
                    ))}
                </div>
            </Card>

            <section className="grid gap-4 md:grid-cols-2">
                {mockAutomations.map(automation => (
                    <Card key={automation.id} variant="default">
                        <h2 className="text-card-title">{automation.name}</h2>
                        <div className="mt-4 space-y-3 text-[13px]">
                            <p><span className="font-semibold text-ink-2">Trigger:</span> <span className="text-ink-3">{automation.trigger}</span></p>
                            <p><span className="font-semibold text-ink-2">Action:</span> <span className="text-ink-3">{automation.action}</span></p>
                            <p><span className="font-semibold text-ink-2">Guardrail:</span> <span className="text-ink-3">{automation.risk}</span></p>
                        </div>
                    </Card>
                ))}
            </section>
        </div>
    );
}

function Summary({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <Card variant="default">
            <div className="mb-3 text-accent">{icon}</div>
            <p className="text-meta">{label}</p>
            <p className="text-metric mt-1">{value}</p>
        </Card>
    );
}
