import { useState } from 'react';
import JDGenerator from '../components/JDGenerator';
import { Users, FileText, CheckCircle, Clock } from 'lucide-react';

export default function RecruiterDashboard() {
    const [activeTab, setActiveTab] = useState('overview');

    // Hardcoded mock data for now
    const candidates = [
        { id: 1, name: "Alice Johnson", role: "Senior Engineer", status: "Interviewed", score: 85, verified: true },
        { id: 2, name: "Bob Smith", role: "Product Manager", status: "Screening", score: 72, verified: false },
        { id: 3, name: "Charlie Brown", role: "Data Scientist", status: "New", score: null, verified: false },
    ];

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Recruiter Dashboard</h1>
                <p className="text-gray-500 mt-1">Manage your hiring pipeline and tools</p>
            </div>

            {/* Tabs */}
            <div className="flex space-x-4 border-b border-gray-200 mb-8">
                <button
                    onClick={() => setActiveTab('overview')}
                    className={`py-2 px-4 font-medium text-sm transition-colors border-b-2 ${activeTab === 'overview' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                >
                    Overview & Pipeline
                </button>
                <button
                    onClick={() => setActiveTab('jd-generator')}
                    className={`py-2 px-4 font-medium text-sm transition-colors border-b-2 ${activeTab === 'jd-generator' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                >
                    JD Generator
                </button>
            </div>

            {/* Content */}
            {activeTab === 'overview' && (
                <div className="space-y-6">
                    {/* Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Active Candidates</p>
                                    <p className="text-3xl font-bold text-gray-900">12</p>
                                </div>
                                <div className="p-3 bg-blue-50 rounded-full">
                                    <Users className="w-6 h-6 text-blue-600" />
                                </div>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Interviews Scheduled</p>
                                    <p className="text-3xl font-bold text-gray-900">4</p>
                                </div>
                                <div className="p-3 bg-purple-50 rounded-full">
                                    <Clock className="w-6 h-6 text-purple-600" />
                                </div>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Hires this Month</p>
                                    <p className="text-3xl font-bold text-gray-900">2</p>
                                </div>
                                <div className="p-3 bg-green-50 rounded-full">
                                    <CheckCircle className="w-6 h-6 text-green-600" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Candidate Table */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h2 className="text-lg font-semibold text-gray-900">Recent Candidates</h2>
                        </div>
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Candidate</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Verify</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {candidates.map((candidate) => (
                                    <tr key={candidate.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{candidate.name}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-500">{candidate.role}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${candidate.status === 'Interviewed' ? 'bg-green-100 text-green-800' :
                                                    candidate.status === 'Screening' ? 'bg-yellow-100 text-yellow-800' :
                                                        'bg-gray-100 text-gray-800'
                                                }`}>
                                                {candidate.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {candidate.score || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {candidate.verified ? (
                                                <CheckCircle className="w-5 h-5 text-green-500" />
                                            ) : (
                                                <span className="text-xs text-gray-400">Pending</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'jd-generator' && (
                <JDGenerator />
            )}
        </div>
    );
}
