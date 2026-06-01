import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Every page in this app is user-specific and auth-gated — there is nothing
// to statically prerender. Forcing dynamic stops the build from trying to
// render these pages (and hit Supabase) at build time.
export const dynamic = "force-dynamic";

/**
 * Root page: bounce signed-in users to /dashboard, everyone else to /login.
 * The proxy will redirect again if 2FA hasn't been completed yet.
 */
export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/dashboard");
  redirect("/login");
}
