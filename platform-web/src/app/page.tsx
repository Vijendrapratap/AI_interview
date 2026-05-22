import Link from "next/link";
import { ArrowRight, Brain, CheckCircle2, Mic, Shield, Sparkles } from "lucide-react";
import Footer from "@/components/layout/Footer";

const proofPoints = [
  "AI screening with recruiter approval",
  "Structured voice interviews",
  "Pipeline decisions in one workspace",
];

export default function Home() {
  return (
    <div className="min-h-screen overflow-hidden text-ink">
      <header className="fixed top-0 z-50 w-full border-b border-border/80 bg-surface/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-sm font-black text-surface">
              R
            </div>
            <div>
              <span className="block text-lg font-black tracking-tight text-ink">ReCruItAI</span>
              <span className="block text-[11px] font-semibold uppercase tracking-[0.22em] text-ink-3">Recruiter OS</span>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="rounded-full px-4 py-2 text-sm font-semibold text-ink-2 transition-colors hover:bg-card hover:text-ink">
              Log in
            </Link>
            <Link
              href="/dashboard"
              className="rounded-full bg-accent px-5 py-2.5 text-sm font-bold text-accent-ink transition-transform hover:-translate-y-0.5 hover:brightness-95"
            >
              Open workspace
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative px-4 pb-20 pt-32 sm:px-6 lg:px-8">
          <div className="absolute left-1/2 top-24 h-72 w-72 -translate-x-1/2 rounded-full bg-accent/25 blur-3xl" />
          <div className="relative mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-ink-2 shadow-card">
                <Sparkles className="h-4 w-4 text-success" />
                Warm cream UI · Slice 1 live
              </div>
              <h1 className="max-w-4xl font-serif text-5xl font-semibold leading-[0.95] tracking-tight text-ink md:text-7xl">
                The calm recruiter workspace for faster hiring decisions.
              </h1>
              <p className="mt-7 max-w-2xl text-lg leading-8 text-ink-2 md:text-xl">
                Screen resumes, run structured AI interviews, and manage candidate decisions from a clean ATS cockpit built around recruiter approval.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-ink px-7 py-4 text-base font-bold text-surface transition-transform hover:-translate-y-0.5"
                >
                  View command center <ArrowRight className="h-5 w-5" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-full border border-border bg-card px-7 py-4 text-base font-bold text-ink transition-colors hover:bg-surface-muted"
                >
                  Try demo login
                </Link>
              </div>
              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {proofPoints.map((point) => (
                  <div key={point} className="flex items-center gap-2 text-sm font-semibold text-ink-2">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    {point}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-border bg-card p-4 shadow-card">
              <div className="rounded-[1.5rem] bg-ink p-5 text-surface">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-surface/50">Today</p>
                    <h2 className="mt-1 text-xl font-bold">Recruiter cockpit</h2>
                  </div>
                  <div className="rounded-full bg-accent px-3 py-1 text-xs font-black text-ink">LIVE</div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Metric label="Needs review" value="17" />
                  <Metric label="SLA risks" value="4" />
                  <Metric label="Interviews" value="9" />
                  <Metric label="Offers" value="3" />
                </div>
                <div className="mt-5 rounded-2xl bg-surface/10 p-4">
                  <p className="text-sm font-bold">Next best action</p>
                  <p className="mt-2 text-sm leading-6 text-surface/70">Send AI technical interview to the top-scored candidate and move two profiles to recruiter review.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-border bg-card/60 py-16">
          <div className="mx-auto grid max-w-7xl gap-5 px-4 sm:px-6 md:grid-cols-3 lg:px-8">
            <FeatureCard icon={<Brain className="h-6 w-6" />} title="Explainable screening" description="Score candidates with must-have matches, gaps, risks, and a plain-language next step." />
            <FeatureCard icon={<Shield className="h-6 w-6" />} title="Recruiter approval" description="AI drafts actions, but recruiters approve test invites, interviews, and decision emails." />
            <FeatureCard icon={<Mic className="h-6 w-6" />} title="AI interview engine" description="Structured voice interviews feed scorecards and keep the hiring team aligned." />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-surface/10 bg-surface/10 p-4">
      <p className="text-3xl font-black text-accent">{value}</p>
      <p className="mt-1 text-sm text-surface/65">{label}</p>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="rounded-[1.5rem] border border-border bg-card p-7 shadow-card transition-transform hover:-translate-y-1">
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-accent text-ink">
        {icon}
      </div>
      <h3 className="text-xl font-black text-ink">{title}</h3>
      <p className="mt-3 leading-7 text-ink-2">{description}</p>
    </div>
  );
}
