import { redirect } from "next/navigation";
import { getCurrentOrgId, isPlatformAdmin } from "@/lib/data/organizations";
import DashboardShell from "./DashboardShell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    // Middleware (proxy.ts) already guarantees an authenticated user here.
    // Guard against the org-less state that caused B2 (and any orphaned account):
    // send them to /onboarding to provision a workspace instead of 500ing every
    // org-scoped page.
    const [orgId, platformAdmin] = await Promise.all([
        getCurrentOrgId(),
        isPlatformAdmin().catch(() => false),
    ]);
    if (!orgId) redirect("/onboarding");

    return <DashboardShell platformAdmin={platformAdmin}>{children}</DashboardShell>;
}
