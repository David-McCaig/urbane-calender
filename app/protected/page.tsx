import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import Calender from "@/components/calender/Calender";

export default async function ProtectedPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  return (
    <div className="">
     <Calender/>
    </div>
  );
}
