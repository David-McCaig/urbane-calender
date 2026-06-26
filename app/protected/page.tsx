import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import Calendar from "@/components/calender/Calendar";

export default async function ProtectedPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  // Redirect to onboarding if user has no active shop set
  if (!data.claims.user_metadata?.active_shop_id) {
    redirect("/onboarding");
  }

  return (
    <div className="w-full">
      <Calendar />
    </div>
  );
}
