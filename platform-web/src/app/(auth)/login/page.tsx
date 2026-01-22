"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { useAppStore } from "@/lib/store"

export default function LoginPage() {
    const router = useRouter()
    const setUser = useAppStore((state) => state.setUser)
    const [isLoading, setIsLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)

    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setIsLoading(true)
        setError("")

        // Mock Authentication Logic
        setTimeout(() => {
            if (email === "recruiter@example.com" && password === "recruiter123") {
                setUser({
                    id: "recruiter_1",
                    name: "Sarah Recruiter",
                    email: email,
                    role: "recruiter"
                })
                router.push("/dashboard")
            } else if (email === "user@example.com" && password === "user123") {
                setUser({
                    id: "candidate_1",
                    name: "Alex Candidate",
                    email: email,
                    role: "candidate"
                })
                router.push("/portal") // Redirect to new Candidate Portal
            } else {
                setError("Invalid credentials. Try recruiter@example.com / recruiter123")
                setIsLoading(false)
            }
        }, 1000)
    }

    return (
        <div className="min-h-screen grid md:grid-cols-2">
            {/* Left Side - Form */}
            <div className="flex flex-col justify-center px-8 md:px-16 lg:px-24 bg-white">
                <div className="mb-10">
                    <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold mb-4">
                        AI
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome back</h1>
                    <p className="text-gray-600">Enter your credentials to access your workspace.</p>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900 bg-white"
                            placeholder="name@company.com"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all pr-10 text-gray-900 bg-white"
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <input id="remember-me" type="checkbox" className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                            <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-600">Remember me</label>
                        </div>
                        <Link href="#" className="text-sm font-medium text-blue-600 hover:text-blue-500">
                            Forgot password?
                        </Link>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isLoading && <Loader2 className="animate-spin w-5 h-5" />}
                        Sign In
                    </button>
                </form>

                <p className="mt-8 text-center text-sm text-gray-600">
                    Don&apos;t have an account?{" "}
                    <Link href="/register" className="font-semibold text-blue-600 hover:text-blue-500">
                        Create account
                    </Link>
                </p>
            </div>

            {/* Right Side - Image/Testimonial */}
            <div className="hidden md:block bg-gray-50 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-900 opacity-90 mix-blend-multiply z-10" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80"
                    alt="Office meeting"
                    className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="relative z-20 flex flex-col justify-end h-full p-16 text-white">
                    <blockquote className="space-y-6">
                        <p className="text-2xl font-medium leading-relaxed">
                            &quot;Recruiter.ai has transformed how we hire. We&apos;ve cut our screening time by 75% and found better candidates faster.&quot;
                        </p>
                        <footer>
                            <p className="text-gray-200 italic">&quot;The automated screening saved us hundreds of hours. Highly recommended!&quot;</p>
                            <div className="mt-4 font-bold text-white">- Sarah&apos;s Feedback, Tech Lead</div>
                        </footer>
                    </blockquote>
                </div>
            </div>
        </div>
    )
}
