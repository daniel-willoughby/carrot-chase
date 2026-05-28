import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Dashboard router: looks up the user's role and forwards to the
 * appropriate role-scoped dashboard.
 */
export default async function DashboardRouter() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  switch (profile?.role) {
    case "super_admin":
      redirect("/dashboard/super");
    case "school_admin":
      redirect("/dashboard/school");
    case "lead":
      redirect("/dashboard/lead");
    default:
      // No role set (or parent role, which is Phase 2).
      // Sign the user out rather than dump them into an empty page.
      redirect("/login?reason=no-role");
  }
}
