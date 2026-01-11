import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Upload, CheckCircle, AlertTriangle, FileText, ArrowRight } from 'lucide-react';
import { verifyIdentity, getResume } from '../services/api';
import toast from 'react-hot-toast';

export default function VerificationPage() {
    const { resumeId } = useParams();
    const navigate = useNavigate();
    const [resumeData, setResumeData] = useState(null);
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [verificationResult, setVerificationResult] = useState(null);

    useEffect(() => {
        const fetchResume = async () => {
            try {
                const data = await getResume(resumeId);
                setResumeData(data);
            } catch (error) {
                toast.error('Failed to load resume details');
            }
        };
        if (resumeId) fetchResume();
    }, [resumeId]);

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleVerify = async () => {
        if (!file) return toast.error('Please select a document first');
        setLoading(true);
        try {
            const result = await verifyIdentity(resumeId, file);
            setVerificationResult(result);
            if (result.overall_status === 'verified') {
                toast.success('Identity Verified Successfully!');
            } else {
                toast.error('Verification Issues Detected');
            }
        } catch (error) {
            toast.error(error.message || 'Verification failed');
        } finally {
            setLoading(false);
        }
    };

    const handleProceed = () => {
        navigate(`/interview/${resumeId}`);
    };

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
            >
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-gray-900">Identity Verification</h1>
                    <p className="mt-2 text-gray-600">
                        Please upload a valid ID document (Passport, DL) to verify your profile and unlock the interview.
                    </p>
                </div>

                {/* Upload Section */}
                <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-12 hover:border-blue-500 transition-colors">
                        <Upload className="w-12 h-12 text-gray-400 mb-4" />
                        <label className="cursor-pointer">
                            <span className="mt-2 block text-sm font-medium text-gray-900">
                                {file ? file.name : "Click to upload ID Document"}
                            </span>
                            <input
                                type="file"
                                className="hidden"
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={handleFileChange}
                            />
                        </label>
                        <p className="mt-1 text-xs text-gray-500">PDF, JPG, PNG up to 5MB</p>
                    </div>

                    <div className="mt-6 flex justify-center">
                        <button
                            onClick={handleVerify}
                            disabled={loading || !file}
                            className={`px-6 py-2 rounded-lg font-medium text-white transition-colors ${loading || !file
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-blue-600 hover:bg-blue-700'
                                }`}
                        >
                            {loading ? 'Verifying...' : 'Verify Identity'}
                        </button>
                    </div>
                </div>

                {/* Results Section */}
                {verificationResult && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={`p-6 rounded-xl border ${verificationResult.overall_status === 'verified' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                            }`}
                    >
                        <div className="flex items-start space-x-4">
                            {verificationResult.overall_status === 'verified' ? (
                                <CheckCircle className="w-6 h-6 text-green-600 mt-1" />
                            ) : (
                                <AlertTriangle className="w-6 h-6 text-red-600 mt-1" />
                            )}
                            <div className="flex-1">
                                <h3 className={`text-lg font-semibold ${verificationResult.overall_status === 'verified' ? 'text-green-900' : 'text-red-900'
                                    }`}>
                                    {verificationResult.overall_status === 'verified' ? 'Verification Successful' : 'Verification Flagged'}
                                </h3>

                                {/* ID Details */}
                                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="font-medium">Name on ID:</span> {verificationResult.identity_verification?.full_name}
                                    </div>
                                    <div>
                                        <span className="font-medium">DOB:</span> {verificationResult.identity_verification?.date_of_birth}
                                    </div>
                                </div>

                                {/* Gap Analysis */}
                                {verificationResult.gap_analysis && (
                                    <div className="mt-4">
                                        <h4 className="font-medium text-gray-900 mb-2">Career Timeline Analysis:</h4>
                                        {verificationResult.gap_analysis.career_gaps?.length > 0 ? (
                                            <ul className="list-disc list-inside text-red-700 space-y-1">
                                                {verificationResult.gap_analysis.career_gaps.map((gap, i) => (
                                                    <li key={i}>
                                                        Gap identified: {gap.start} to {gap.end} ({gap.duration_months} months)
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="text-green-700">No significant career gaps detected.</p>
                                        )}
                                    </div>
                                )}

                                {verificationResult.overall_status === 'verified' && (
                                    <div className="mt-6">
                                        <button
                                            onClick={handleProceed}
                                            className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                                        >
                                            <span>Proceed to Interview</span>
                                            <ArrowRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </motion.div>
        </div>
    );
}
