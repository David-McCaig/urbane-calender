import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { resolveActiveShop } from '@/lib/actions/membership';
import { OnboardingClient } from './onboarding-client';

export default async function OnboardingPage() {
  let shopId: string | null;
  try {
    shopId = await resolveActiveShop();
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'Not authenticated') {
      redirect('/auth/login');
    }
    throw err; // let network/Supabase errors reach the error.tsx boundary
  }

  if (shopId) {
    redirect('/protected');
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return <OnboardingClient userEmail={user?.email} />;
}
