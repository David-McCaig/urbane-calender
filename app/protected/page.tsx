import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import Calendar from "@/components/calender/Calendar";

export default async function ProtectedPage() {
  const supabase = await createClient();

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    redirect("/auth/login");
  }

  const user = authData.user;

  // Determine the active shop: use metadata or fall back to first membership
  let activeShopId = user.user_metadata?.active_shop_id as string | undefined;

  if (!activeShopId) {
    // Check if user has any memberships — pick the first one
    const { data: memberships } = await supabase
      .from("user_shop_memberships")
      .select("shop_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1);

    if (memberships && memberships.length > 0) {
      activeShopId = memberships[0].shop_id;
      // Persist this choice so subsequent requests have it
      await supabase.auth.updateUser({
        data: { active_shop_id: activeShopId },
      });
    }
  }

  if (!activeShopId) {
    redirect("/onboarding");
  }

  return (
    <div className="w-full">
      <Calendar />
    </div>
  );
}
