import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { resolveActiveShop } from '@/lib/actions/membership';
import { OnboardingClient } from './onboarding-client';

export default async function OnboardingPage() {
  // Check if the user just created/joined a shop via onboarding —
  // if so, don't redirect so they see the Lightspeed connection step
  const cookieStore = await cookies();
  const onboardingPending = cookieStore.get('onboarding_lightspeed_pending');

  let shopId: string | null;
  try {
    shopId = await resolveActiveShop();
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'Not authenticated') {
      redirect('/auth/login');
    }
    throw err; // let network/Supabase errors reach the error.tsx boundary
  }

  if (shopId && !onboardingPending) {
    redirect('/protected');
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return <OnboardingClient userEmail={user?.email} />;
}
