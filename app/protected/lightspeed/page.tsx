import { redirect } from "next/navigation";

import { resolveActiveShop } from "@/lib/actions/membership";
import LightspeedAuth from "@/components/lightspeed/lightspeed-auth";
import { getAccountDetails } from "@/lib/database/lightspeed";

export default async function LightspeedPage() {


  return <LightspeedAuth />;
}
