import { redirect } from "next/navigation";

import { resolveActiveShop } from "@/lib/actions/membership";
import Calendar from "@/components/calender/Calendar";

export default async function ProtectedPage() {
  let shopId: string | null;
  try {
    shopId = await resolveActiveShop();
  } catch {
    redirect("/auth/login");
  }

  if (!shopId) {
    redirect("/onboarding");
  }

  return (
    <div className="w-full">
      <Calendar />
    </div>
  );
}
