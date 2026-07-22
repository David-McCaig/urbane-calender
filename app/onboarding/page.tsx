import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { OnboardingClient } from './onboarding-client';

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Only check user_metadata.active_shop_id — do NOT use resolveActiveShop().
  // resolveActiveShop() falls back to querying user_shop_memberships, which
  // would find the membership created by createShopAndMembership and redirect
  // to /protected before the Lightspeed connect step renders.
  const activeShopId = user.user_metadata?.active_shop_id as string | undefined;
  if (activeShopId) {
    redirect('/protected');
  }

  return <OnboardingClient userEmail={user?.email} />;
}
