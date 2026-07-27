import { redirect } from "next/navigation";
import { resolveActiveShop, getCurrentUserRole } from "@/lib/actions/membership";
import { getValidAccessToken } from "@/lib/lightspeed/api";
import { IntegrationsClient } from "./integrations-client";

export default async function IntegrationsPage() {
  let shopId: string | null;
  try {
    shopId = await resolveActiveShop();
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "Not authenticated") {
      redirect("/auth/login");
    }
    throw err;
  }

  if (!shopId) {
    redirect("/onboarding");
  }

  const [currentRole, token] = await Promise.all([
    getCurrentUserRole(),
    getValidAccessToken(shopId).catch(() => null),
  ]);

  const connected = token !== null;

  let accountName: string | null = null;
  let accountError = false;

  if (connected) {
    try {
      const response = await fetch(
        "https://api.lightspeedapp.com/API/V3/Account.json",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (response.ok) {
        const data = await response.json();
        accountName = data?.Account?.name ?? null;
      } else {
        accountError = true;
      }
    } catch {
      accountError = true;
    }
  }

  return (
    <IntegrationsClient
      connected={connected}
      accountName={accountName}
      accountError={accountError}
      currentRole={currentRole}
    />
  );
}
