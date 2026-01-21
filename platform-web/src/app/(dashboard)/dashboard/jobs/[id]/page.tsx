"use client"

import { mockJobs, mockCandidates } from "@/lib/mockData"
import Link from "next/link"
import { use } from "react"
import { ArrowLeft, MapPin, DollarSign, Users, Filter } from "lucide-react"

export default function JobDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const job = mockJobs.find(j => j.id === id)
    const candidates = mockCandidates.filter(c => c.job_id === id)

    if (!job) return <div className="p-8">Job not found</div>

    return (
        <div className="p-8">
            <Link href="/dashboard/jobs" className="flex items-center text-gray-500 hover:text-gray-900 mb-6 transition-colors">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Jobs
            </Link>

            <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm mb-8">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">{job.title}</h1>
                        <div className="flex items-center gap-4 text-gray-500 mb-4">
                            <span className="flex items-center gap-1"><MapPin size={16} /> {job.location}</span>
                            <span className="flex items-center gap-1"><DollarSign size={16} /> {job.salary_range}</span>
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium">{job.type}</span>
                        </div>
                        <p className="text-gray-600 max-w-2xl">{job.description}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        <div className="text-right">
                            <div className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Total Applicants</div>
                            <div className="text-3xl font-black text-gray-900">{candidates.length}</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        <Users size={18} className="text-blue-600" /> Candidates
                    </h3>
                    <div className="flex gap-2">
                        <button className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-white">
                            <Filter size={14} /> Pipeline Stage
                        </button>
                    </div>
                </div>

                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-medium">
                        <tr>
                            <th className="px-6 py-4">Name</th>
                            <th className="px-6 py-4">Match Score</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4">Verification</th>
                            <th className="px-6 py-4">Missing Skills</th>
                            <th className="px-6 py-4">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {candidates.map(candidate => (
                            <tr key={candidate.id} className="hover:bg-gray-50/80 transition-colors">
                                <td className="px-6 py-4 font-medium text-gray-900">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                                            {candidate.avatar}
                                        </div>
                                        {candidate.name}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className={`font-bold ${candidate.resume_analysis.match_percentage >= 80 ? 'text-green-600' : 'text-yellow-600'
                                        }`}>
                                        {candidate.resume_analysis.match_percentage}%
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">
                                        {candidate.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    {candidate.verification.status === 'Verified' ? (
                                        <span className="text-green-600 text-xs font-semibold flex items-center gap-1">
                                            ✓ Verified
                                        </span>
                                    ) : (
                                        <span className="text-gray-400 text-xs">Pending</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-xs text-red-500">
                                    {candidate.resume_analysis.skills_missing.length > 0
                                        ? candidate.resume_analysis.skills_missing.join(", ")
                                        : <span className="text-gray-300">-</span>}
                                </td>
                                <td className="px-6 py-4">
                                    <Link href={`/dashboard/candidates/${candidate.id}`} className="text-blue-600 text-sm font-medium hover:underline">
                                        View Report
                                    </Link>
                                </td>
                            </tr>
                        ))}
                        {candidates.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                    No candidates found for this job yet.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
