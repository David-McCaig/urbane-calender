import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { resolveActiveShop } from "@/lib/actions/membership";
import { getAccountDetails } from "@/lib/database/lightspeed";
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

  // Temp: verify Lightspeed OAuth flow works end-to-end
  const cookieStore = await cookies();
  const lightspeedToken = cookieStore.get("lightspeed_token")?.value;

  if (lightspeedToken) {
    try {
      const accountDetails = await getAccountDetails();
      console.log("Lightspeed account details:", accountDetails);
    } catch (error) {
      console.error("Failed to fetch Lightspeed account details:", error);
    }
  }

  return (
    <div className="w-full">
      <Calendar />
    </div>
  );
}
