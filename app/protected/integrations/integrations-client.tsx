"use client";

import AuthButton from "@/components/lightspeed/auth-button";
import { LightspeedLogoutButton } from "@/components/lightspeed/lightspeed-logout-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Plug,
  CheckCircle2,
  AlertTriangle,
  Building2,
} from "lucide-react";
import type { MembershipRole } from "@/lib/types/membership";

interface IntegrationsClientProps {
  connected: boolean;
  accountName: string | null;
  accountError: boolean;
  currentRole: MembershipRole | null;
}

export function IntegrationsClient({
  connected,
  accountName,
  accountError,
  currentRole,
}: IntegrationsClientProps) {
  const isOwner = currentRole === "owner";

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Plug className="h-6 w-6" />
          Integrations
        </h1>
        <p className="text-gray-500 mt-1">
          Connect third-party services to your shop
        </p>
      </div>

      {/* Lightspeed Card */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-white dark:bg-white flex items-center justify-center shrink-0 overflow-hidden">
              <img
                src="/lightspeed-logo.svg"
                alt="Lightspeed"
                className="h-7 w-7 object-contain"
              />
            </div>
            <div className="flex items-center gap-2">
              <span>Lightspeed Retail</span>
              {connected && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  <CheckCircle2 className="h-3 w-3" />
                  Connected
                </span>
              )}
            </div>
          </CardTitle>
          <CardDescription>
            {connected
              ? "Your Lightspeed POS is connected and work orders can be imported."
              : "Connect your Lightspeed Retail POS to import work orders and manage your service calendar."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {connected && (
            <>
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <Building2 className="h-5 w-5 text-gray-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-gray-500">Lightspeed Account</p>
                  <p className="text-sm font-medium truncate">
                    {accountName ?? "Connected"}
                  </p>
                </div>
              </div>

              {accountError && (
                <Alert className="bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                  <AlertDescription className="text-yellow-700 dark:text-yellow-300">
                    Could not fetch account details. Your token is valid but the
                    Lightspeed API may be temporarily unavailable.
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}

          <div className="pt-2">
            {connected ? (
              isOwner && <LightspeedLogoutButton />
            ) : (
              <AuthButton />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
