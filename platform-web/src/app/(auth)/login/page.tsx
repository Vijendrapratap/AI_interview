"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Card } from "@/components/Card"
import { Button } from "@/components/Button"
import { Input } from "@/components/Field"

export default function LoginPage() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")
    const [needsConfirm, setNeedsConfirm] = useState(false)
    const [resent, setResent] = useState(false)

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setIsLoading(true)
        setError("")
        setNeedsConfirm(false)

        const supabase = createClient()
        const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
        if (authError) {
            setError(authError.message)
            if (/confirm/i.test(authError.message)) setNeedsConfirm(true)
            setIsLoading(false)
            return
        }
        router.push("/dashboard")
        router.refresh()
    }

    async function resendConfirmation() {
        if (!email) return
        const supabase = createClient()
        await supabase.auth.resend({ type: "signup", email })
        setResent(true)
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <Card className="w-full max-w-md p-10">
                <h1 className="font-serif text-3xl text-ink mb-1 tracking-tight">Welcome back</h1>
                <p className="text-ink-2 mb-8">Sign in to your recruiter workspace</p>

                {error && (
                    <div role="alert" aria-live="polite" className="mb-4 text-danger text-sm">
                        {error}
                        {needsConfirm && (
                            <div className="mt-2">
                                {resent ? (
                                    <span className="text-ink-2">Confirmation email re-sent to {email}.</span>
                                ) : (
                                    <button type="button" onClick={resendConfirmation} className="text-ink underline underline-offset-2">
                                        Resend confirmation email
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label htmlFor="email" className="mb-1.5 block text-[12px] font-bold text-ink-2">
                            Email address
                        </label>
                        <Input
                            id="email"
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="name@company.com"
                        />
                    </div>

                    <div>
                        <label htmlFor="password" className="mb-1.5 block text-[12px] font-bold text-ink-2">
                            Password
                        </label>
                        <div className="relative">
                            <Input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="pr-10"
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                aria-label={showPassword ? "Hide password" : "Show password"}
                                aria-pressed={showPassword}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink-2"
                            >
                                {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
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
                                <Loader2 aria-hidden="true" className="animate-spin w-4 h-4 mr-2" />
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
                        Create an organization
                    </Link>
                </p>
            </Card>
        </div>
    )
}
