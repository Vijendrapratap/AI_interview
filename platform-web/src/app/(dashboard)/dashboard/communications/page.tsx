"use client"

import { Mail, MessageCircle, Send } from "lucide-react";
import { mockCommunicationTemplates } from "@/lib/mockData";
import { ComingSoonBanner } from "@/components/Banner";

export default function CommunicationsPage() {
    return (
        <div className="p-8 space-y-8">
            <ComingSoonBanner className="mb-6" />
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Communication Center</h1>
                <p className="text-gray-500">Templates and candidate updates that reduce repetitive recruiter admin work.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Panel icon={<Mail />} title="Email templates" body="Interview invites, rejections, follow-ups, and feedback reminders." />
                <Panel icon={<MessageCircle />} title="Candidate status" body="Keep candidates informed without manual check-ins." />
                <Panel icon={<Send />} title="Bulk sends" body="Draft bulk updates with recruiter approval before sending." />
            </div>

            <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="border-b border-gray-100 p-6">
                    <h2 className="text-lg font-bold text-gray-900">Recruiter Templates</h2>
                </div>
                <div className="grid gap-4 p-6 md:grid-cols-2">
                    {mockCommunicationTemplates.map(template => (
                        <div key={template.id} className="rounded-xl border border-gray-200 p-5">
                            <div className="mb-2 flex items-center justify-between">
                                <h3 className="font-semibold text-gray-900">{template.name}</h3>
                                <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">{template.status}</span>
                            </div>
                            <p className="text-sm text-gray-500">{template.use}</p>
                            <p className="mt-3 text-xs font-medium uppercase tracking-wide text-gray-400">{template.channel}</p>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}

function Panel({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
    return <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"><div className="mb-3 text-blue-600">{icon}</div><h2 className="font-semibold text-gray-900">{title}</h2><p className="mt-2 text-sm text-gray-500">{body}</p></div>;
}
