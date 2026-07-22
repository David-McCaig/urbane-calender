'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getErrorMessage } from '@/lib/error-utils';
import { acceptInvitation } from '@/lib/actions/membership';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { XCircle } from 'lucide-react';

interface AcceptInvitationFormProps {
  token: string;
  shopName: string;
  inviteEmail: string;
}

export function AcceptInvitationForm({
  token,
  shopName,
  inviteEmail,
}: AcceptInvitationFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleAccept = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await acceptInvitation(token);
      router.push('/protected');
    } catch (err: unknown) {
      setError(
        getErrorMessage(err, 'Failed to accept invitation')
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-2xl">Accept Invitation</CardTitle>
        <CardDescription>
          You&apos;re about to join <strong>{shopName}</strong>. This invitation
          was sent to {inviteEmail}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          {error ? (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
              <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          ) : null}
          <Button onClick={handleAccept} disabled={isLoading} className="w-full">
            {isLoading ? 'Accepting...' : 'Join Shop'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
