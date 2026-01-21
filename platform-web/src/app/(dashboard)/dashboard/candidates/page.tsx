"use client"

import { useState, useMemo } from "react"
import { mockCandidates } from "@/lib/mockData"
import Link from "next/link"
import { Search, ArrowUpDown, Share2 } from "lucide-react"

export default function CandidatesPage() {
    const [searchQuery, setSearchQuery] = useState("")
    const [statusFilter, setStatusFilter] = useState("All")

    const filteredCandidates = useMemo(() => {
        return mockCandidates.filter(candidate => {
            const matchesSearch = candidate.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                candidate.role_applied.toLowerCase().includes(searchQuery.toLowerCase()) ||
                candidate.email.toLowerCase().includes(searchQuery.toLowerCase())

            const matchesStatus = statusFilter === "All" || candidate.status === statusFilter

            return matchesSearch && matchesStatus
        })
    }, [searchQuery, statusFilter])

    const statuses = ["All", "Received", "Screening", "Interview", "Offer", "Rejected"]

    return (
        <div className="p-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Candidates</h1>
                    <p className="text-gray-500">Manage and screen your candidate pipeline.</p>
                </div>
                <div className="flex gap-4">
                    {/* Mock Export */}
                    <button className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors">
                        Export CSV
                    </button>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {['Received', 'Screening', 'Interview', 'Offer'].map(status => (
                    <div key={status} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                        <div className="text-gray-500 text-xs uppercase font-bold tracking-wider mb-1">{status}</div>
                        <div className="text-2xl font-bold text-gray-900">
                            {mockCandidates.filter(c => c.status === status).length}
                        </div>
                    </div>
                ))}
            </div>

            {/* Toolbar */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6 flex flex-col md:flex-row justify-between gap-4">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search by name, role, email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                    />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
                    {statuses.map(status => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${statusFilter === status
                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                                }`}
                        >
                            {status}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-medium">
                            <tr>
                                <th className="px-6 py-4">Candidate</th>
                                <th className="px-6 py-4">Role Applied</th>
                                <th className="px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors flex items-center gap-1 group">
                                    Score <ArrowUpDown size={12} className="opacity-0 group-hover:opacity-100" />
                                </th>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Stage</th>
                                <th className="px-6 py-4">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredCandidates.length > 0 ? (
                                filteredCandidates.map(candidate => (
                                    <tr key={candidate.id} className="hover:bg-gray-50/80 transition-colors group cursor-pointer relative">
                                        <td className="px-6 py-4">
                                            {/* Full row link */}
                                            <Link href={`/dashboard/candidates/${candidate.id}`} className="absolute inset-0 z-10" />
                                            <div className="flex items-center gap-3 relative z-0">
                                                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
                                                    {candidate.avatar}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900">{candidate.name}</p>
                                                    <p className="text-xs text-gray-500">{candidate.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 font-medium relative z-0">{candidate.role_applied}</td>
                                        <td className="px-6 py-4 relative z-0">
                                            <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border
                        ${candidate.score >= 80 ? 'bg-green-50 text-green-700 border-green-200' :
                                                    candidate.score >= 60 ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                                        'bg-red-50 text-red-700 border-red-200'}`}>
                                                {candidate.score}/100
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 text-sm relative z-0">{candidate.applied_at}</td>
                                        <td className="px-6 py-4 relative z-0">
                                            <StatusBadge status={candidate.status} />
                                        </td>
                                        <td className="px-6 py-4 relative z-0">
                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigator.clipboard.writeText(`${window.location.origin}/interview/${candidate.id}`);
                                                        alert("Interview link copied to clipboard!");
                                                    }}
                                                    className="text-gray-400 hover:text-blue-600 transition-colors"
                                                    title="Copy Interview Link"
                                                >
                                                    <Share2 size={18} />
                                                </button>
                                                <Link
                                                    href={`/dashboard/candidates/${candidate.id}`}
                                                    className="text-blue-600 font-medium text-sm hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    View
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                        No candidates found matching your filters.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination mock */}
                <div className="p-4 border-t border-gray-100 flex justify-between items-center text-sm text-gray-500">
                    <span>Showing {filteredCandidates.length} results</span>
                    <div className="flex gap-2">
                        <button className="px-3 py-1 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50" disabled>Previous</button>
                        <button className="px-3 py-1 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50" disabled>Next</button>
                    </div>
                </div>
            </div>
        </div>
    )
}

function StatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        'Received': 'bg-gray-100 text-gray-600',
        'Screening': 'bg-blue-100 text-blue-700',
        'Interview': 'bg-purple-100 text-purple-700',
        'Offer': 'bg-green-100 text-green-700',
        'Rejected': 'bg-red-100 text-red-700',
    }

    return (
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
            {status}
        </span>
    );
}
