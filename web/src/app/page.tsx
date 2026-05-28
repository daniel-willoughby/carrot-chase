import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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
