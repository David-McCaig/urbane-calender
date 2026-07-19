import { redirect } from 'next/navigation';

import { resolveActiveShop, getCurrentUserRole } from '@/lib/actions/membership';
import { getLightspeedStatus } from '@/lib/actions/lightspeed';
import { LightspeedSettings } from '@/components/settings/lightspeed-settings';

export default async function SettingsPage() {
  let shopId: string | null;
  try {
    shopId = await resolveActiveShop();
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'Not authenticated') {
      redirect('/auth/login');
    }
    throw err;
  }

  if (!shopId) {
    redirect('/onboarding');
  }

  const role = await getCurrentUserRole(shopId);

  // Only owners and managers can access settings
  if (role !== 'owner' && role !== 'manager') {
    redirect('/protected');
  }

  const lightspeedStatus = await getLightspeedStatus(shopId);

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage shop integrations and preferences.
        </p>
      </div>

      <LightspeedSettings
        initialStatus={lightspeedStatus}
        shopId={shopId}
        isOwner={role === 'owner'}
      />
    </div>
  );
}
