"use client"

import { Bot, ShieldCheck, Zap } from "lucide-react";
import { mockAutomations } from "@/lib/mockData";

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
