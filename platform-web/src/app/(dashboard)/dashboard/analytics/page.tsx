"use client"

import { BarChart3, Clock, ShieldAlert, TrendingUp, Users } from "lucide-react";
import { mockAnalytics } from "@/lib/mockData";

export default function AnalyticsPage() {
    const maxPipeline = mockAnalytics.pipeline_stats[0]?.value || 1;

    return (
        <div className="p-8 space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Recruiting Analytics</h1>
                <p className="text-gray-500">Measure speed, quality, source ROI, bottlenecks, and AI screening impact.</p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-5">
                <StatBox label="Time to Hire" value={mockAnalytics.avg_time_to_hire} icon={<Clock className="text-blue-600" />} />
                <StatBox label="Offer Acceptance" value="53%" icon={<TrendingUp className="text-green-600" />} />
                <StatBox label="Candidates" value={mockAnalytics.total_candidates} icon={<Users className="text-purple-600" />} />
                <StatBox label="AI Pass Rate" value="41%" icon={<BarChart3 className="text-orange-600" />} />
                <StatBox label="SLA Risks" value={mockAnalytics.sla_risks} icon={<ShieldAlert className="text-red-600" />} />
            </div>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <h3 className="mb-6 text-lg font-bold text-gray-900">Pipeline Conversion</h3>
                    <div className="space-y-4">
                        {mockAnalytics.pipeline_stats.map((stat, idx) => (
                            <div key={stat.name}>
                                <div className="mb-1 flex justify-between text-sm font-medium"><span className="text-gray-700">{stat.name}</span><span className="text-gray-900">{stat.value}</span></div>
                                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100"><div className={`h-full rounded-full ${["bg-gray-400", "bg-blue-500", "bg-purple-500", "bg-green-500", "bg-green-600"][idx]}`} style={{ width: `${(stat.value / maxPipeline) * 100}%` }} /></div>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <h3 className="mb-6 text-lg font-bold text-gray-900">Source Quality</h3>
                    <div className="space-y-4">
                        {mockAnalytics.source_performance.map(source => (
                            <div key={source.source} className="rounded-lg border border-gray-100 p-4">
                                <div className="mb-2 flex justify-between"><span className="font-medium text-gray-900">{source.source}</span><span className="font-bold text-green-700">{source.quality}%</span></div>
                                <p className="text-sm text-gray-500">{source.candidates} candidates reviewed</p>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
}

function StatBox({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
    return <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"><div className="mb-4 flex items-start justify-between"><div><p className="mb-1 text-sm font-medium text-gray-500">{label}</p><h3 className="text-2xl font-bold text-gray-900">{value}</h3></div><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-50">{icon}</div></div></div>;
}
