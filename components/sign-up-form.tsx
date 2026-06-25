"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { createShopAndMembership } from "@/lib/actions/membership";
import { acceptInvitation } from "@/lib/actions/membership";

export function SignUpForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const searchParams = useSearchParams();
  const inviteTokenParam = searchParams.get("inviteToken") || "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [shopName, setShopName] = useState("");
  const [inviteToken, setInviteToken] = useState(inviteTokenParam);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const showInviteToken = inviteTokenParam || inviteToken;

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    if (password !== repeatPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    // Validate: must provide either shop name or invite token
    if (!shopName.trim() && !inviteToken.trim()) {
      setError(
        "Please enter a shop name to create a new shop, or provide an invitation token to join an existing shop."
      );
      setIsLoading(false);
      return;
    }

    if (shopName.trim() && inviteToken.trim()) {
      setError(
        "Please provide either a shop name OR an invitation token, not both."
      );
      setIsLoading(false);
      return;
    }

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) throw signUpError;

      // If creating a new shop, call the server action
      if (shopName.trim()) {
        try {
          await createShopAndMembership(shopName.trim());
          router.push("/protected");
        } catch (actionError: unknown) {
          setError(
            actionError instanceof Error
              ? actionError.message
              : "Failed to create shop"
          );
          setIsLoading(false);
          return;
        }
      } else if (inviteToken.trim()) {
        // If accepting an invitation, call the server action
        try {
          await acceptInvitation(inviteToken.trim());
          router.push("/protected");
        } catch (actionError: unknown) {
          setError(
            actionError instanceof Error
              ? actionError.message
              : "Failed to accept invitation"
          );
          setIsLoading(false);
          return;
        }
      } else {
        router.push("/auth/sign-up-success");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Sign up</CardTitle>
          <CardDescription>
            {inviteTokenParam
              ? "Create an account to accept your invitation"
              : "Create a new account and set up your shop"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="repeat-password">Repeat Password</Label>
                </div>
                <Input
                  id="repeat-password"
                  type="password"
                  required
                  value={repeatPassword}
                  onChange={(e) => setRepeatPassword(e.target.value)}
                />
              </div>

              {!inviteTokenParam && (
                <div className="border-t pt-4">
                  <div className="grid gap-2">
                    <Label htmlFor="shop-name">
                      Shop Name{" "}
                      <span className="text-gray-400 font-normal">
                        (create a new shop)
                      </span>
                    </Label>
                    <Input
                      id="shop-name"
                      type="text"
                      placeholder="My Auto Repair Shop"
                      value={shopName}
                      onChange={(e) => setShopName(e.target.value)}
                      disabled={!!inviteToken}
                    />
                  </div>
                </div>
              )}

              <div className="grid gap-2">
                <Label htmlFor="invite-token">
                  Invitation Token{" "}
                  <span className="text-gray-400 font-normal">
                    (join an existing shop)
                  </span>
                </Label>
                <Input
                  id="invite-token"
                  type="text"
                  placeholder="Paste your invitation link or token"
                  value={inviteToken}
                  onChange={(e) => setInviteToken(e.target.value)}
                  disabled={!!shopName.trim()}
                />
                {showInviteToken && (
                  <p className="text-xs text-gray-500">
                    You&apos;ve been invited to join a shop. Complete sign-up to
                    accept.
                  </p>
                )}
              </div>

              {!shopName.trim() && !inviteToken.trim() && (
                <p className="text-sm text-gray-500">
                  Enter a shop name to create your own shop, or paste an
                  invitation token to join an existing one.
                </p>
              )}

              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Creating an account..." : "Sign up"}
              </Button>
            </div>
            <div className="mt-4 text-center text-sm">
              Already have an account?{" "}
              <Link
                href={
                  inviteTokenParam
                    ? `/auth/login?inviteToken=${encodeURIComponent(inviteTokenParam)}`
                    : "/auth/login"
                }
                className="underline underline-offset-4"
              >
                Login
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
