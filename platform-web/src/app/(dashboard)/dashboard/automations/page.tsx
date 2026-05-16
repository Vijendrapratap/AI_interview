"use client"

import { Bot, MailCheck, ShieldCheck, Zap } from "lucide-react";
import { mockAutomations, screeningRules, testEmailDrafts } from "@/lib/mockData";

export default function AutomationsPage() {
    return (
        <div className="p-8 space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Recruiter Copilot Automations</h1>
                <p className="text-gray-500">AI assists the workflow, but recruiter approval stays in the loop for high-impact decisions.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Summary icon={<Bot />} label="Copilot workflows" value="4" />
                <Summary icon={<ShieldCheck />} label="Human approvals" value="Required" />
                <Summary icon={<Zap />} label="Admin hours saved" value="11h/wk" />
            </div>

            <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-center justify-between gap-4">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Resume score → test email rule</h2>
                        <p className="text-sm text-gray-500">This converts incoming resumes into a clear recruiter approval queue.</p>
                    </div>
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700">Default pass score: 75</span>
                </div>
                <div className="grid gap-3 lg:grid-cols-3">
                    {screeningRules.map(rule => (
                        <div key={rule.label} className="rounded-lg border border-gray-100 p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{rule.threshold}</p>
                            <h3 className="mt-1 font-bold text-gray-900">{rule.label}</h3>
                            <p className="mt-2 text-sm text-gray-600">{rule.action}</p>
                            <p className="mt-3 text-xs font-medium text-emerald-700">{rule.guardrail}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-center gap-3">
                    <div className="rounded-lg bg-blue-50 p-2 text-blue-700"><MailCheck size={20} /></div>
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Test emails waiting for recruiter approval</h2>
                        <p className="text-sm text-gray-500">The platform drafts the next step; recruiters approve before anything goes out.</p>
                    </div>
                </div>
                <div className="divide-y divide-gray-100">
                    {testEmailDrafts.map(draft => (
                        <div key={draft.candidate} className="grid gap-3 py-4 md:grid-cols-[1fr_1fr_auto] md:items-center">
                            <div>
                                <p className="font-semibold text-gray-900">{draft.candidate}</p>
                                <p className="text-sm text-gray-500">{draft.role} · AI score {draft.score}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-900">{draft.subject}</p>
                                <p className="text-sm text-gray-500">{draft.test}</p>
                            </div>
                            <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Approve send</button>
                        </div>
                    ))}
                </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2">
                {mockAutomations.map(automation => (
                    <div key={automation.id} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                        <h2 className="font-bold text-gray-900">{automation.name}</h2>
                        <div className="mt-4 space-y-3 text-sm">
                            <p><span className="font-semibold text-gray-700">Trigger:</span> <span className="text-gray-600">{automation.trigger}</span></p>
                            <p><span className="font-semibold text-gray-700">Action:</span> <span className="text-gray-600">{automation.action}</span></p>
                            <p><span className="font-semibold text-gray-700">Guardrail:</span> <span className="text-gray-600">{automation.risk}</span></p>
                        </div>
                    </div>
                ))}
            </section>
        </div>
    );
}

function Summary({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"><div className="mb-3 text-blue-600">{icon}</div><p className="text-sm text-gray-500">{label}</p><p className="text-2xl font-bold text-gray-900">{value}</p></div>;
}
