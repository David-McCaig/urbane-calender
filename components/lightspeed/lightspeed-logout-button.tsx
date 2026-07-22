"use client";

import { Button } from "@/components/ui/button";
import { logoutLightspeed } from "@/lib/actions/light-speed";

export function LightspeedLogoutButton() {
  return (
    <Button
      variant="outline"
      size="default"
      onClick={() => logoutLightspeed()}
    >
      Lightspeed Logout
    </Button>
  );
}
