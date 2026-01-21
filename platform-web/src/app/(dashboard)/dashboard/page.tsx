"use client"

import Link from "next/link";
import {
    Briefcase,
    Users,
    UserCheck,
    FileText,
    Plus
} from "lucide-react";
import { mockAnalytics, mockJobs, mockCandidates } from "@/lib/mockData";

export default function Dashboard() {
    return (
        <div className="p-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Overview</h1>
                    <p className="text-gray-500">Welcome back, Recruiter. Here&apos;s your pipeline status.</p>
                </div>
                <Link
                    href="/dashboard/jobs/new"
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2 transition-colors"
                >
                    <Plus size={18} /> New Job
                </Link>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <StatCard label="Active Jobs" value={mockAnalytics.active_jobs.toString()} trend="+2 new" icon={<Briefcase className="text-blue-600" />} />
                <StatCard label="Total Candidates" value={mockAnalytics.total_candidates.toString()} trend="+5 today" icon={<FileText className="text-purple-600" />} />
                <StatCard label="Offers Sent" value={mockAnalytics.offers_sent.toString()} trend="Active" icon={<Users className="text-orange-600" />} />
                <StatCard label="Hires Closed" value={mockAnalytics.hires_made.toString()} trend="This Month" icon={<UserCheck className="text-green-600" />} />
            </div>

            {/* Main Content Grid: Job Pipeline & Recent Candidates */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* Active Jobs Pipeline */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                    <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                        <h2 className="text-lg font-bold text-gray-900">Active Jobs</h2>
                        <Link href="/dashboard/jobs" className="text-sm text-blue-600 font-medium hover:underline">View All</Link>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-medium">
                                <tr>
                                    <th className="px-6 py-4">Role</th>
                                    <th className="px-6 py-4">Pool</th>
                                    <th className="px-6 py-4">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {mockJobs.slice(0, 3).map(job => (
                                    <tr key={job.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-900">{job.title}</td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {job.stages.received + job.stages.screening + job.stages.interview + job.stages.offer}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${job.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                                                }`}>
                                                {job.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Recent Candidates Quick View */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                    <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                        <h2 className="text-lg font-bold text-gray-900">Recent Candidates</h2>
                        <Link href="/dashboard/candidates" className="text-sm text-blue-600 font-medium hover:underline">View All</Link>
                    </div>
                    <div className="divide-y divide-gray-100">
                        {mockCandidates.slice(0, 3).map(candidate => (
                            <Link
                                href={`/dashboard/candidates/${candidate.id}`}
                                key={candidate.id}
                                className="block p-4 hover:bg-gray-50 transition-colors flex items-center justify-between group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-sm font-medium text-gray-600 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                                        {candidate.avatar}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">{candidate.name}</p>
                                        <p className="text-xs text-gray-500">{candidate.role_applied}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className={`text-sm font-bold ${candidate.score >= 80 ? 'text-green-600' : candidate.score >= 60 ? 'text-yellow-600' : 'text-red-600'
                                        }`}>
                                        {candidate.score}
                                    </div>
                                    <div className="text-xs text-gray-400">Score</div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ label, value, trend, icon }: { label: string; value: string; trend: string; icon: React.ReactNode }) {
    return (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center">
                    {icon}
                </div>
                <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">{trend}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 mb-1">{value}</p>
            <p className="text-sm text-gray-500">{label}</p>
        </div>
    );
}
