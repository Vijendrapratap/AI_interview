"use client"

import { useState, useMemo } from "react"
import { mockJobs } from "@/lib/mockData"
import Link from "next/link"
import { Search, Plus, MapPin, DollarSign, Filter, MoreHorizontal, Briefcase } from "lucide-react"

export default function JobsPage() {
    const [searchQuery, setSearchQuery] = useState("")

    const filteredJobs = useMemo(() => {
        return mockJobs.filter(job =>
            job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            job.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
            job.department.toLowerCase().includes(searchQuery.toLowerCase())
        )
    }, [searchQuery])

    return (
        <div className="p-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Active Jobs</h1>
                    <p className="text-gray-500">Manage your job postings and hiring pipelines.</p>
                </div>
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2">
                    <Plus size={18} /> New Job
                </button>
            </div>

            {/* Toolbar */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6 flex justify-between items-center">
                <div className="relative w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search jobs, locations..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                        <Filter size={16} /> Filter
                    </button>
                </div>
            </div>

            <div className="grid gap-4">
                {filteredJobs.length > 0 ? (
                    filteredJobs.map(job => (
                        <div key={job.id} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                        <Briefcase size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-gray-900">{job.title}</h3>
                                        <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                                            <span className="flex items-center gap-1"><MapPin size={14} /> {job.location}</span>
                                            <span className="flex items-center gap-1"><DollarSign size={14} /> {job.salary_range}</span>
                                            <span className="px-2 py-0.5 bg-gray-100 rounded text-xs font-medium">{job.type}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${job.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                                        }`}>
                                        {job.status}
                                    </span>
                                    <button className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-50">
                                        <MoreHorizontal size={20} />
                                    </button>
                                </div>
                            </div>

                            <div className="border-t border-gray-100 pt-4 mt-2">
                                <div className="flex justify-between items-center">
                                    <div className="flex gap-6 text-sm">
                                        <div className="flex flex-col">
                                            <span className="text-gray-500 text-xs uppercase font-semibold">Total</span>
                                            <span className="font-bold text-gray-900">{job.stages.received + job.stages.screening + job.stages.interview + job.stages.offer}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-gray-500 text-xs uppercase font-semibold">Interview</span>
                                            <span className="font-bold text-blue-600">{job.stages.interview}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-gray-500 text-xs uppercase font-semibold">Offer</span>
                                            <span className="font-bold text-green-600">{job.stages.offer}</span>
                                        </div>
                                    </div>
                                    <Link href={`/dashboard/jobs/${job.id}`} className="text-blue-600 text-sm font-medium hover:underline">
                                        View Details
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="p-12 text-center text-gray-500 bg-white rounded-xl border border-gray-200 border-dashed">
                        No jobs found matching &quot;{searchQuery}&quot;
                    </div>
                )}
            </div>
        </div>
    )
}
