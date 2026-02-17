import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { login } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [isRecruiter, setIsRecruiter] = useState(true);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await login(email, password);
        } catch (error) {
            // Error handled in context
        } finally {
            setIsLoading(false);
        }
    };

    const accentColor = isRecruiter ? 'blue' : 'emerald';

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-md w-full space-y-8 bg-gray-800 p-8 rounded-xl border border-gray-700 shadow-2xl"
            >
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
                        Sign in to AI Interviewer
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-400">
                        Or{' '}
                        <Link to="/register" className={`font-medium text-${accentColor}-500 hover:text-${accentColor}-400`}>
                            create a new account
                        </Link>
                    </p>
                </div>

                {/* ── Role Toggle Switch ── */}
                <div className="flex items-center justify-center gap-4 py-3">
                    <span className={`text-sm font-medium transition-colors ${!isRecruiter ? 'text-emerald-400' : 'text-gray-500'}`}>
                        Candidate
                    </span>
                    <button
                        type="button"
                        id="role-toggle"
                        onClick={() => setIsRecruiter(!isRecruiter)}
                        className={`relative inline-flex h-7 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 ${isRecruiter
                                ? 'bg-blue-600 focus:ring-blue-500'
                                : 'bg-emerald-600 focus:ring-emerald-500'
                            }`}
                        aria-label="Toggle between candidate and recruiter login"
                    >
                        <span
                            className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition-transform duration-300 ease-in-out ${isRecruiter ? 'translate-x-7' : 'translate-x-0'
                                }`}
                        />
                    </button>
                    <span className={`text-sm font-medium transition-colors ${isRecruiter ? 'text-blue-400' : 'text-gray-500'}`}>
                        Recruiter
                    </span>
                </div>

                {/* Role Context Hint */}
                <p className="text-center text-xs text-gray-500">
                    {isRecruiter
                        ? '🔍 Recruiter view — Evaluate resumes, score candidates, and make hiring decisions'
                        : '📝 Candidate view — Get career gap analysis, keyword tips, and resume improvement advice'}
                </p>

                <form className="mt-4 space-y-6" onSubmit={handleSubmit}>
                    <div className="rounded-md shadow-sm -space-y-px">
                        <div>
                            <label htmlFor="email-address" className="sr-only">Email address</label>
                            <input
                                id="email-address"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                className={`appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-700 placeholder-gray-500 text-white bg-gray-900 rounded-t-md focus:outline-none focus:ring-${accentColor}-500 focus:border-${accentColor}-500 focus:z-10 sm:text-sm`}
                                placeholder="Email address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="sr-only">Password</label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                className={`appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-700 placeholder-gray-500 text-white bg-gray-900 rounded-b-md focus:outline-none focus:ring-${accentColor}-500 focus:border-${accentColor}-500 focus:z-10 sm:text-sm`}
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white transition-colors ${isRecruiter
                                    ? 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                                    : 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500'
                                } focus:outline-none focus:ring-2 focus:ring-offset-2 ${isLoading ? 'opacity-75 cursor-not-allowed' : ''}`}
                        >
                            {isLoading
                                ? 'Signing in...'
                                : isRecruiter
                                    ? '🔍 Sign in as Recruiter'
                                    : '📝 Sign in as Candidate'}
                        </button>
                    </div>
                </form>

                {/* Demo Credentials — changes based on toggle */}
                <div className="mt-6 p-4 bg-gray-700/50 rounded-lg border border-gray-600">
                    <p className="text-xs text-gray-400 text-center mb-3">
                        {isRecruiter ? '🔑 Recruiter Demo Accounts' : '🔑 Candidate Demo Account'} (click to fill)
                    </p>
                    <div className="space-y-2">
                        {isRecruiter ? (
                            <>
                                <button
                                    onClick={() => { setEmail('recruiter@company.com'); setPassword('recruiter123'); }}
                                    className="w-full text-left px-3 py-2 bg-gray-800 rounded-md hover:bg-gray-600 transition-colors"
                                >
                                    <span className="text-sm text-white">recruiter@company.com</span>
                                    <span className="text-xs text-gray-400 ml-2">/ recruiter123</span>
                                </button>
                                <button
                                    onClick={() => { setEmail('hr@techcorp.com'); setPassword('hr123456'); }}
                                    className="w-full text-left px-3 py-2 bg-gray-800 rounded-md hover:bg-gray-600 transition-colors"
                                >
                                    <span className="text-sm text-white">hr@techcorp.com</span>
                                    <span className="text-xs text-gray-400 ml-2">/ hr123456</span>
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={() => { setEmail('candidate@demo.com'); setPassword('candidate123'); }}
                                className="w-full text-left px-3 py-2 bg-gray-800 rounded-md hover:bg-gray-600 transition-colors"
                            >
                                <span className="text-sm text-white">candidate@demo.com</span>
                                <span className="text-xs text-gray-400 ml-2">/ candidate123</span>
                            </button>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

