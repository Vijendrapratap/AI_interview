import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * Request-deduped auth helpers. `supabase.auth.getUser()` makes a network call to
 * Supabase Auth (in ap-southeast-2) on EVERY invocation; without deduping, a single
 * page render hit it 3-4 times (layout + page + actions), each adding ~150-350ms.
 * React `cache()` collapses all calls within one server render into a single trip.
 */
export const getCachedUser = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
});

export const getCachedOrgId = cache(async (): Promise<string | null> => {
  const user = await getCachedUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  return data?.organization_id ?? null;
});
