import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import Calendar from "@/components/calender/Calendar";

export default async function ProtectedPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  return (
    <div className="w-full">
      <Calendar />
    </div>
  );
}
