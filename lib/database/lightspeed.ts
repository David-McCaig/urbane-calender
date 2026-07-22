import { getValidAccessToken } from "@/lib/lightspeed/api";

const LIGHTSPEED_API_URL = "https://api.lightspeedapp.com";

/**
 * Fetches account details from the Lightspeed API for the given shop.
 * Uses the database-backed token store with automatic refresh.
 */
export async function getAccountDetails(shopId: string) {
  const token = await getValidAccessToken(shopId);

  if (!token) {
    throw new Error("No Lightspeed integration found for this shop");
  }

  const response = await fetch(`${LIGHTSPEED_API_URL}/API/V3/Account.json`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(
      `Lightspeed API error: ${response.status} ${await response.text()}`,
    );
  }

  return response.json();
}
