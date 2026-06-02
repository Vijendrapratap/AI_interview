import { redirect } from "next/navigation";
import { getCachedUser, getCachedOrgId } from "@/lib/auth";
import OnboardingForm from "./OnboardingForm";

export default async function OnboardingPage() {
    const user = await getCachedUser();
    if (!user) redirect("/login");

    // Already provisioned (e.g. via the 007 trigger or a prior visit): skip ahead.
    const orgId = await getCachedOrgId();
    if (orgId) redirect("/dashboard");

    const meta = user.user_metadata ?? {};
    const defaultName =
        (meta.org_name as string | undefined)?.trim() ||
        ((meta.full_name as string | undefined)?.trim()
            ? `${(meta.full_name as string).trim()}'s workspace`
            : "") ||
        (user.email ? `${user.email.split("@")[0]}'s workspace` : "");

    return <OnboardingForm defaultName={defaultName} />;
}
