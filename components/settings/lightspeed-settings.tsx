'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getErrorMessage } from '@/lib/error-utils';
import {
  initiateLightspeedAuth,
  syncLightspeedWorkOrders,
  disconnectLightspeed,
} from '@/lib/actions/lightspeed';
import type { LightspeedStatus } from '@/lib/actions/lightspeed';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Link2, RefreshCw, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';

interface LightspeedSettingsProps {
  initialStatus: LightspeedStatus;
  shopId: string;
  isOwner: boolean;
}

export function LightspeedSettings({
  initialStatus,
  shopId,
  isOwner,
}: LightspeedSettingsProps) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    count: number | null;
    error?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = useCallback(async () => {
    setError(null);
    try {
      await initiateLightspeedAuth(shopId);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to connect.'));
    }
  }, [shopId]);

  const handleSync = useCallback(async () => {
    setIsSyncing(true);
    setSyncResult(null);
    setError(null);
    try {
      const result = await syncLightspeedWorkOrders(shopId);
      if (result.success) {
        setSyncResult({ count: result.count });
      } else {
        setSyncResult({ count: null, error: result.error });
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to sync work orders.'));
    } finally {
      setIsSyncing(false);
    }
  }, [shopId]);

  const handleDisconnect = useCallback(async () => {
    setIsDisconnecting(true);
    setError(null);
    try {
      const result = await disconnectLightspeed(shopId);
      if (result.success) {
        setStatus({ connected: false, accountId: null, shopId });
        setSyncResult(null);
      } else {
        setError(result.error ?? 'Failed to disconnect Lightspeed.');
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to disconnect Lightspeed.'));
    } finally {
      setIsDisconnecting(false);
    }
  }, [shopId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="h-5 w-5" />
          Lightspeed Integration
        </CardTitle>
        <CardDescription>
          {status.connected
            ? 'Your Lightspeed account is connected. Work orders are synced automatically when you view the calendar.'
            : 'Connect your Lightspeed account to sync work orders into your calendar.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <p className="text-sm text-red-500 mb-3">{error}</p>
        )}

        {status.connected ? (
          <div className="space-y-4">
            {/* Connected status */}
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              Connected
              {status.accountId && (
                <span className="text-muted-foreground">
                  (Account: {status.accountId})
                </span>
              )}
            </div>

            {/* Sync result */}
            {syncResult && (
              <div
                className={`text-sm flex items-center gap-2 ${
                  syncResult.error ? 'text-red-500' : 'text-muted-foreground'
                }`}
              >
                {syncResult.error ? (
                  <>
                    <AlertCircle className="h-4 w-4" />
                    {syncResult.error}
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Synced {syncResult.count} work orders.
                  </>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSync}
                disabled={isSyncing}
                className="gap-2"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`}
                />
                {isSyncing ? 'Syncing...' : 'Sync Now'}
              </Button>
              {isOwner && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDisconnect}
                  disabled={isDisconnecting}
                  className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                >
                  <Trash2 className="h-4 w-4" />
                  {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
                </Button>
              )}
            </div>
          </div>
        ) : (
          <Button onClick={handleConnect} className="gap-2">
            <Link2 className="h-4 w-4" />
            Connect to Lightspeed
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
