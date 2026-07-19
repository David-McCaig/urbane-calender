import { redirect } from "next/navigation";

import { resolveActiveShop } from "@/lib/actions/membership";
import { fetchLightspeedWorkOrders } from "@/lib/lightspeed/api";
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

  // Fetch Lightspeed work orders and log server-side (MVP)
  try {
    const workOrders = await fetchLightspeedWorkOrders(shopId);
    if (workOrders) {
      console.log(
        `Lightspeed work orders for shop ${shopId}:`,
        JSON.stringify(workOrders, null, 2),
      );
    } else {
      console.log(
        `No Lightspeed integration configured for shop ${shopId}`,
      );
    }
  } catch (error) {
    console.error('Failed to fetch Lightspeed work orders:', error);
  }

  return (
    <div className="w-full">
      <Calendar />
    </div>
  );
}
