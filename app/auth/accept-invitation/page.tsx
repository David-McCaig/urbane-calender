import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { AcceptInvitationForm } from './accept-invitation-form';

export default async function AcceptInvitationPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    redirect('/auth/login');
  }

  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  // Check if the invitation exists and is valid (for messaging)
  const { data: invitation } = await supabase
    .from('invitations')
    .select('email, shop:shops(name)')
    .eq('token', token)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (!invitation) {
    return (
      <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-2xl">Invalid Invitation</CardTitle>
            <CardDescription>
              This invitation link has expired or is no longer valid. Please ask the shop owner for a new invitation.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (user) {
    // User is authenticated — show accept form
    return (
      <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
        <AcceptInvitationForm
          token={token}
          shopName={(invitation.shop as any)?.name || 'the shop'}
          inviteEmail={invitation.email}
        />
      </div>
    );
  }

  // User is not authenticated — show sign in / sign up options
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">You&apos;ve been invited!</CardTitle>
          <CardDescription>
            You&apos;ve been invited to join{' '}
            <strong>{(invitation.shop as any)?.name || 'a shop'}</strong>.
            Sign in or create an account to accept the invitation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            <Button asChild className="w-full">
              <Link href={`/auth/sign-up?inviteToken=${encodeURIComponent(token)}`}>
                Create an account
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href={`/auth/login?inviteToken=${encodeURIComponent(token)}`}>
                Sign in
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
