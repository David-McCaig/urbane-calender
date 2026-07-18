import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { resolveActiveShop } from '@/lib/actions/membership';
import { OnboardingClient } from './onboarding-client';

export default async function OnboardingPage() {
  let shopId: string | null;
  try {
    shopId = await resolveActiveShop();
  } catch {
    redirect('/auth/login');
  }

  if (shopId) {
    redirect('/protected');
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return <OnboardingClient userEmail={user?.email} />;
}
