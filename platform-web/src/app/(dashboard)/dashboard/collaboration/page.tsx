"use client"

import { Bell, MessageSquare, Users } from "lucide-react";
import { mockCollaborationQueue } from "@/lib/mockData";

export default function CollaborationPage() {
    return (
        <div className="p-8 space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Hiring Team Collaboration</h1>
                <p className="text-gray-500">Keep hiring managers, interviewers, and recruiters aligned on decisions.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card icon={<Users />} label="Hiring team members" value="14" />
                <Card icon={<MessageSquare />} label="Pending scorecards" value="6" />
                <Card icon={<Bell />} label="Overdue reminders" value="2" />
            </div>

            <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="border-b border-gray-100 p-6">
                    <h2 className="text-lg font-bold text-gray-900">Feedback Queue</h2>
                    <p className="text-sm text-gray-500">Structured scorecards prevent vague feedback and speed up decisions.</p>
                </div>
                <div className="divide-y divide-gray-100">
                    {mockCollaborationQueue.map(item => (
                        <div key={item.id} className="grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-center">
                            <div>
                                <p className="font-semibold text-gray-900">{item.candidate}</p>
                                <p className="text-sm text-gray-500">{item.role} · Reviewer: {item.reviewer}</p>
                                <p className="mt-1 text-xs text-gray-400">Due: {item.due}</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${item.status === "Overdue" ? "bg-red-50 text-red-700" : item.status === "Submitted" ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"}`}>{item.status}</span>
                                <button className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">{item.action}</button>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}

function Card({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"><div className="mb-3 text-blue-600">{icon}</div><p className="text-sm text-gray-500">{label}</p><p className="text-3xl font-bold text-gray-900">{value}</p></div>;
}
