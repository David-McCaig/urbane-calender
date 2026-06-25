import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { OnboardingClient } from './onboarding-client';

export default async function OnboardingPage() {
  const supabase = await createClient();

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    redirect('/auth/login');
  }

  const user = authData.user;

  // Check if user already has a shop membership
  const { data: memberships } = await supabase
    .from('user_shop_memberships')
    .select('id')
    .eq('user_id', user.id);

  if (memberships && memberships.length > 0) {
    // User already belongs to at least one shop — ensure active_shop_id is set
    if (!user.user_metadata?.active_shop_id) {
      // Set it to the first membership
      const { error: updateError } = await supabase.auth.updateUser({
        data: { active_shop_id: memberships[0].id },
      });
      // Redirect regardless — the membership is already there
    }
    redirect('/protected');
  }

  return <OnboardingClient userEmail={user.email} />;
}
