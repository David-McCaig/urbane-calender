"use client";

import { Button } from "@/components/ui/button";
import { logoutLightspeed } from "@/lib/actions/light-speed";

export function LightspeedLogoutButton() {
  return (
    <Button
      variant="outline"
      size="default"
      className="border-white/20 bg-transparent text-white/80 hover:bg-white/10 hover:text-white"
      onClick={() => logoutLightspeed()}
    >
      Lightspeed Logout
    </Button>
  );
}
