"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { useAppStore } from "@/lib/store"
import { Card } from "@/components/Card"
import { Button } from "@/components/Button"

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
        <div className="min-h-screen flex items-center justify-center p-4 bg-surface">
            <Card className="w-full max-w-md p-10">
                <h1 className="font-serif text-3xl text-ink mb-1 tracking-tight">Welcome back</h1>
                <p className="text-ink-2 mb-8">Sign in to your recruiter workspace</p>

                {error && (
                    <div className="mb-4 text-danger text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-ink mb-1">Email address</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full h-10 px-3 rounded-md border border-border bg-card text-ink placeholder:text-ink-3 focus:outline-none focus:ring-2 focus:ring-accent"
                            placeholder="name@company.com"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-ink mb-1">Password</label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full h-10 px-3 pr-10 rounded-md border border-border bg-card text-ink placeholder:text-ink-3 focus:outline-none focus:ring-2 focus:ring-accent"
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink-2"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <input id="remember-me" type="checkbox" className="h-4 w-4 rounded border-border" />
                            <label htmlFor="remember-me" className="ml-2 block text-sm text-ink-2">Remember me</label>
                        </div>
                        <Link href="#" className="text-sm text-ink underline underline-offset-2">
                            Forgot password?
                        </Link>
                    </div>

                    <Button variant="primary" type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? (
                            <>
                                <Loader2 className="animate-spin w-4 h-4 mr-2" />
                                Signing in…
                            </>
                        ) : (
                            "Sign in"
                        )}
                    </Button>
                </form>

                <p className="text-sm text-ink-2 mt-6 text-center">
                    Don&apos;t have an account?{" "}
                    <Link href="/signup" className="text-ink underline underline-offset-2">
                        Create account
                    </Link>
                </p>
            </Card>
        </div>
    )
}
