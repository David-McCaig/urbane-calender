import { redirect } from "next/navigation";

import { resolveActiveShop } from "@/lib/actions/membership";
import Calendar from "@/components/calender/Calendar";

export default async function ProtectedPage() {
  let shopId: string | null;
  try {
    shopId = await resolveActiveShop();
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'Not authenticated') {
      redirect("/auth/login");
    }
    throw err; // let network/Supabase errors reach the error.tsx boundary
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
