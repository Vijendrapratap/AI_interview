import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Loader2, Sparkles, Check, Copy } from 'lucide-react';
import { generateJD } from '../services/api';
import toast from 'react-hot-toast';

export default function JDGenerator() {
    const [formData, setFormData] = useState({
        role: '',
        industry: '',
        seniority: 'Mid-Level',
        skills: '' // comma separated
    });
    const [loading, setLoading] = useState(false);
    const [generatedJD, setGeneratedJD] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const skillsList = formData.skills.split(',').map(s => s.trim()).filter(s => s);
            const result = await generateJD(formData.role, formData.industry, formData.seniority, skillsList);
            setGeneratedJD(result);
            toast.success('JD Generated Successfully!');
        } catch (error) {
            toast.error('Failed to generate JD');
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = () => {
        if (!generatedJD) return;
        const text = `
Title: ${generatedJD.title}

Summary:
${generatedJD.summary}

Responsibilities:
${generatedJD.responsibilities.map(r => `- ${r}`).join('\n')}

Required Skills:
${generatedJD.required_skills.join(', ')}

Preferred Skills:
${generatedJD.preferred_skills.join(', ')}

Benefits:
${generatedJD.benefits.map(b => `- ${b}`).join('\n')}
    `;
        navigator.clipboard.writeText(text);
        toast.success('Copied to clipboard');
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                    <Sparkles className="w-5 h-5 mr-2 text-purple-600" />
                    AI Job Description Generator
                </h2>
            </div>

            <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Role Title</label>
                        <input
                            type="text"
                            required
                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 py-2 px-3 border"
                            placeholder="e.g. Senior Backend Engineer"
                            value={formData.role}
                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                            <input
                                type="text"
                                required
                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 py-2 px-3 border"
                                placeholder="e.g. Fintech"
                                value={formData.industry}
                                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Seniority</label>
                            <select
                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 py-2 px-3 border"
                                value={formData.seniority}
                                onChange={(e) => setFormData({ ...formData, seniority: e.target.value })}
                            >
                                <option>Entry Level</option>
                                <option>Mid-Level</option>
                                <option>Senior</option>
                                <option>Staff/Principal</option>
                                <option>Executive</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Key Skills (comma separated)</label>
                        <textarea
                            required
                            rows={3}
                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 py-2 px-3 border"
                            placeholder="Python, AWS, System Design..."
                            value={formData.skills}
                            onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            'Generate JD'
                        )}
                    </button>
                </form>

                {/* Preview */}
                <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 min-h-[400px] max-h-[600px] overflow-y-auto">
                    {!generatedJD ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400">
                            <FileText className="w-12 h-12 mb-2" />
                            <p>Generated content will appear here</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex justify-between items-start">
                                <h3 className="text-lg font-bold text-gray-900">{generatedJD.title}</h3>
                                <button onClick={copyToClipboard} className="text-gray-500 hover:text-purple-600">
                                    <Copy className="w-5 h-5" />
                                </button>
                            </div>

                            <div>
                                <h4 className="font-semibold text-gray-700">Summary</h4>
                                <p className="text-sm text-gray-600">{generatedJD.summary}</p>
                            </div>

                            <div>
                                <h4 className="font-semibold text-gray-700">Responsibilities</h4>
                                <ul className="list-disc list-inside text-sm text-gray-600">
                                    {generatedJD.responsibilities.map((item, i) => (
                                        <li key={i}>{item}</li>
                                    ))}
                                </ul>
                            </div>

                            <div>
                                <h4 className="font-semibold text-gray-700">Required Skills</h4>
                                <div className="flex flex-wrap gap-2 mt-1">
                                    {generatedJD.required_skills.map((skill, i) => (
                                        <span key={i} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">{skill}</span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
