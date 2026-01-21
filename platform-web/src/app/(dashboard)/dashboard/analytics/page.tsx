"use client"

import { mockAnalytics } from "@/lib/mockData"
import { BarChart3, TrendingUp, Users, Clock } from "lucide-react"

export default function AnalyticsPage() {
    return (
        <div className="p-8">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
                <p className="text-gray-500">Insights into your hiring performance.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <StatBox label="Time to Hire" value={mockAnalytics.avg_time_to_hire} icon={<Clock className="text-blue-600" />} />
                <StatBox label="Offers Acceptance" value="53%" icon={<TrendingUp className="text-green-600" />} />
                <StatBox label="Total Candidates" value={mockAnalytics.total_candidates} icon={<Users className="text-purple-600" />} />
                <StatBox label="Cost per Hire" value="$1,200" icon={<BarChart3 className="text-orange-600" />} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 mb-6">Pipeline Conversion</h3>
                    <div className="space-y-4">
                        {mockAnalytics.pipeline_stats.map((stat, idx) => (
                            <div key={stat.name}>
                                <div className="flex justify-between text-sm font-medium mb-1">
                                    <span className="text-gray-700">{stat.name}</span>
                                    <span className="text-gray-900">{stat.value}</span>
                                </div>
                                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full ${['bg-gray-400', 'bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-green-600'][idx]}`}
                                        style={{ width: `${(stat.value / mockAnalytics.pipeline_stats[0].value) * 100}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-center">
                    <div className="text-center">
                        <p className="text-gray-500 mb-2">More charts coming soon...</p>
                        <div className="w-full h-48 bg-gray-50 rounded-lg flex items-center justify-center border border-dashed border-gray-200">
                            Chart Placeholder
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

function StatBox({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
    return (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <p className="text-sm text-gray-500 font-medium mb-1">{label}</p>
                    <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
                </div>
                <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center">
                    {icon}
                </div>
            </div>
        </div>
    )
}
