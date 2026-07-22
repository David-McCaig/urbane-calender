import axios from "axios";
import { cookies } from "next/headers";

export async function getAccountId(token: string) {
    const lightSpeedApiUrl = process?.env?.LIGHTSPEED_API_URL;

    if (!token) {
      throw new Error("No token found");
    }

    // Fetch account ID if not cached
    const response = await axios.get(`${lightSpeedApiUrl}/API/V3/Account.json`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const accountId = response?.data?.Account?.accountID;
    // Store account ID in an HTTP-only cookie

    return accountId;
  }

export async function getAccountDetails() {
    const cookieStore = await cookies();
    const token = cookieStore.get("lightspeed_token")?.value;

    if (!token) {
      throw new Error("No token found");
    }

    const lightSpeedApiUrl = process?.env?.LIGHTSPEED_API_URL;

    const response = await axios.get(`${lightSpeedApiUrl}/API/V3/Account.json`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response?.data;
  }