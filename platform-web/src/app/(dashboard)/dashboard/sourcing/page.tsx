"use client"

import { Search, TrendingUp } from "lucide-react";
import { mockSourcingChannels } from "@/lib/mockData";

export default function SourcingPage() {
    return (
        <div className="p-8 space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Sourcing & Talent Rediscovery</h1>
                <p className="text-gray-500">Track channel quality and rediscover past applicants before paying for new sourcing.</p>
            </div>

            <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-3">
                    <Search className="text-gray-400" size={18} />
                    <input className="w-full outline-none" placeholder="Semantic search: Senior Python engineer with AWS and FastAPI..." />
                </div>
                <p className="text-sm text-gray-500">Search is mocked for now; backend semantic candidate rediscovery is the next persistence milestone.</p>
            </section>

            <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="border-b border-gray-100 p-6">
                    <h2 className="text-lg font-bold text-gray-900">Source Quality</h2>
                </div>
                <div className="divide-y divide-gray-100">
                    {mockSourcingChannels.map(source => (
                        <div key={source.source} className="grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-center">
                            <div>
                                <p className="font-semibold text-gray-900">{source.source}</p>
                                <p className="text-sm text-gray-500">{source.recommendation}</p>
                            </div>
                            <div className="flex items-center gap-5 text-sm">
                                <span>{source.volume} candidates</span>
                                <span className="flex items-center gap-1 font-semibold text-green-700"><TrendingUp size={16} /> {source.quality}% quality</span>
                                <span className="text-gray-500">{source.cost}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
