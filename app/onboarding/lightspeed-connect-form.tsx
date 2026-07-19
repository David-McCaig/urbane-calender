'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getErrorMessage } from '@/lib/error-utils';
import { setActiveShop } from '@/lib/actions/membership';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Link2, SkipForward } from 'lucide-react';

interface LightspeedConnectFormProps {
  shopId: string;
}

export function LightspeedConnectForm({ shopId }: LightspeedConnectFormProps) {
  const router = useRouter();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    try {
      await setActiveShop(shopId);
      router.push('/api/lightspeed/authorize');
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to connect. Please try again.'));
      setIsConnecting(false);
    }
  }, [router, shopId]);

  const handleSkip = useCallback(async () => {
    setIsSkipping(true);
    setError(null);
    try {
      await setActiveShop(shopId);
      router.push('/protected');
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to continue. Please try again.'));
      setIsSkipping(false);
    }
  }, [router, shopId]);

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Connect Lightspeed</CardTitle>
          <CardDescription>
            Connect your Lightspeed account to sync work orders automatically.
            You can also do this later from settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button
              variant="default"
              className="w-full justify-start gap-3 h-auto py-4"
              onClick={handleConnect}
              disabled={isConnecting || isSkipping}
            >
              <Link2 className="h-5 w-5" />
              <div className="text-left">
                <div className="font-medium">
                  {isConnecting ? 'Connecting...' : 'Connect to Lightspeed'}
                </div>
                <div className="text-xs text-muted-foreground">
                  Authorize with your Lightspeed account
                </div>
              </div>
            </Button>
            <Button
              variant="outline"
              className="w-full justify-center gap-2"
              onClick={handleSkip}
              disabled={isConnecting || isSkipping}
            >
              <SkipForward className="h-4 w-4" />
              {isSkipping ? 'Continuing...' : 'Skip for now'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
