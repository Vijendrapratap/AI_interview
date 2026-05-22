"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { acceptInvitation } from "@/lib/data/organizations"
import { Card } from "@/components/Card"
import { Button } from "@/components/Button"
import { Input } from "@/components/Field"

function AcceptInviteContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const token = searchParams.get("token") ?? ""

    const [isLoading, setIsLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [mode, setMode] = useState<"signin" | "signup">("signup")
    const [fullName, setFullName] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")

    if (!token) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <Card className="w-full max-w-md p-10 text-center">
                    <h1 className="font-serif text-2xl text-ink mb-3">Invalid invitation</h1>
                    <p className="text-ink-2 text-sm mb-6">
                        This invitation link is missing a token. Please use the link sent to your email.
                    </p>
                    <Link href="/login" className="text-sm text-ink underline underline-offset-2">
                        Back to sign in
                    </Link>
                </Card>
            </div>
        )
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setIsLoading(true)
        setError("")

        const supabase = createClient()

        if (mode === "signup") {
            const { error: signUpError } = await supabase.auth.signUp({
                email,
                password,
                options: { data: { full_name: fullName } },
            })
            if (signUpError) {
                setError(signUpError.message)
                setIsLoading(false)
                return
            }
        } else {
            const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
            if (signInError) {
                setError(signInError.message)
                setIsLoading(false)
                return
            }
        }

        try {
            await acceptInvitation(token)
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Failed to accept invitation"
            if (msg.toLowerCase().includes("expired") || msg.toLowerCase().includes("invalid")) {
                setError("This invitation has expired or is invalid. Please request a new one.")
            } else {
                setError(msg)
            }
            setIsLoading(false)
            return
        }

        router.push("/dashboard")
        router.refresh()
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <Card className="w-full max-w-md p-10">
                <h1 className="font-serif text-3xl text-ink mb-1 tracking-tight">Join your team</h1>
                <p className="text-ink-2 mb-6">
                    {mode === "signup"
                        ? "Create an account to accept this invitation"
                        : "Sign in to accept this invitation"}
                </p>

                <div className="flex gap-2 mb-6">
                    <button
                        type="button"
                        onClick={() => setMode("signup")}
                        className={`flex-1 py-2 text-[13px] font-bold rounded-field border transition-colors ${
                            mode === "signup"
                                ? "bg-accent text-accent-ink border-accent"
                                : "bg-card text-ink-2 border-border hover:bg-surface-muted"
                        }`}
                    >
                        New account
                    </button>
                    <button
                        type="button"
                        onClick={() => setMode("signin")}
                        className={`flex-1 py-2 text-[13px] font-bold rounded-field border transition-colors ${
                            mode === "signin"
                                ? "bg-accent text-accent-ink border-accent"
                                : "bg-card text-ink-2 border-border hover:bg-surface-muted"
                        }`}
                    >
                        Sign in
                    </button>
                </div>

                {error && (
                    <div role="alert" aria-live="polite" className="mb-4 text-danger text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    {mode === "signup" && (
                        <div>
                            <label htmlFor="full-name" className="mb-1.5 block text-[12px] font-bold text-ink-2">
                                Your full name
                            </label>
                            <Input
                                id="full-name"
                                type="text"
                                required
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                placeholder="Jane Smith"
                            />
                        </div>
                    )}

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
                                minLength={mode === "signup" ? 8 : undefined}
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

                    <Button variant="primary" type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? (
                            <>
                                <Loader2 aria-hidden="true" className="animate-spin w-4 h-4 mr-2" />
                                {mode === "signup" ? "Creating account…" : "Signing in…"}
                            </>
                        ) : mode === "signup" ? (
                            "Create account & join"
                        ) : (
                            "Sign in & join"
                        )}
                    </Button>
                </form>
            </Card>
        </div>
    )
}

export default function AcceptInvitePage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center p-4">
                    <Card className="w-full max-w-md p-10 flex items-center justify-center">
                        <Loader2 className="animate-spin text-ink-3" size={24} />
                    </Card>
                </div>
            }
        >
            <AcceptInviteContent />
        </Suspense>
    )
}
