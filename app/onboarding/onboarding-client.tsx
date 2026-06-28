'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createShopAndMembership } from '@/lib/actions/membership';
import { acceptInvitation } from '@/lib/actions/membership';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Store, Link2, LogOut } from 'lucide-react';

interface OnboardingClientProps {
  userEmail?: string;
}

export function OnboardingClient({ userEmail }: OnboardingClientProps) {
  const [mode, setMode] = useState<'choose' | 'create' | 'join'>('choose');
  const [shopName, setShopName] = useState('');
  const [inviteToken, setInviteToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleCreateShop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopName.trim()) {
      setError('Please enter a shop name.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await createShopAndMembership(shopName.trim());
      router.push('/protected');
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Failed to create shop'
      );
      setIsLoading(false);
    }
  };

  const handleJoinShop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteToken.trim()) {
      setError('Please enter an invitation token or link.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Extract token from full URL if user pasted a link
      const url = inviteToken.trim();
      let token = url;
      if (url.includes('token=')) {
        const urlObj = new URL(url);
        token = urlObj.searchParams.get('token') || url;
      }

      await acceptInvitation(token);
      router.push('/protected');
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Failed to accept invitation'
      );
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  if (mode === 'choose') {
    return (
      <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-2xl">Welcome!</CardTitle>
            <CardDescription>
              {userEmail
                ? `Signed in as ${userEmail}. Let's get you set up with a shop.`
                : "Let's get you set up with a shop."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              <Button
                variant="default"
                className="w-full justify-start gap-3 h-auto py-4"
                onClick={() => setMode('create')}
              >
                <Store className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-medium">Create a new shop</div>
                  <div className="text-xs text-gray-500">
                    Start fresh with your own auto repair shop
                  </div>
                </div>
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-auto py-4"
                onClick={() => setMode('join')}
              >
                <Link2 className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-medium">Join an existing shop</div>
                  <div className="text-xs text-gray-500">
                    Accept an invitation from a shop owner
                  </div>
                </div>
              </Button>
            </div>
            <div className="mt-4 pt-4 border-t">
              <Button
                variant="ghost"
                className="w-full justify-start gap-2 text-gray-500"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Create shop form
  if (mode === 'create') {
    return (
      <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-2xl">Create Your Shop</CardTitle>
            <CardDescription>
              Give your shop a name to get started.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateShop} className="flex flex-col gap-4">
              <div className="grid gap-2">
                <Label htmlFor="shop-name">Shop Name</Label>
                <Input
                  id="shop-name"
                  type="text"
                  placeholder="My Auto Repair Shop"
                  required
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  autoFocus
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? 'Creating...' : 'Create Shop'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setMode('choose');
                  setError(null);
                }}
              >
                Back
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Join shop form
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Join a Shop</CardTitle>
          <CardDescription>
            Paste the invitation link or token you received from the shop owner.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleJoinShop} className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label htmlFor="invite-token">Invitation Link or Token</Label>
              <Input
                id="invite-token"
                type="text"
                placeholder="Paste your invitation link or token"
                required
                value={inviteToken}
                onChange={(e) => setInviteToken(e.target.value)}
                autoFocus
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? 'Joining...' : 'Join Shop'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setMode('choose');
                setError(null);
              }}
            >
              Back
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
