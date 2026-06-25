import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { MembersClient } from './members-client';
import type { UserShopMembership, Invitation } from '@/lib/types/membership';

export default async function MembersPage() {
  const supabase = await createClient();

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    redirect('/auth/login');
  }

  const user = authData.user;
  const shopId = user.user_metadata?.active_shop_id;

  if (!shopId) {
    redirect('/onboarding');
  }

  // Get current user's role
  const { data: currentMember } = await supabase
    .from('user_shop_memberships')
    .select('role')
    .eq('user_id', user.id)
    .eq('shop_id', shopId)
    .single();

  const currentRole = (currentMember?.role as string) || null;

  // Get all members for this shop
  const { data: members } = await supabase
    .from('user_shop_memberships')
    .select('*')
    .eq('shop_id', shopId)
    .order('created_at', { ascending: true });

  // Get pending invitations
  const { data: invitations } = await supabase
    .from('invitations')
    .select('*')
    .eq('shop_id', shopId)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  return (
    <MembersClient
      members={(members || []) as UserShopMembership[]}
      invitations={(invitations || []) as Invitation[]}
      currentUserId={user.id}
      currentRole={currentRole}
      shopId={shopId}
    />
  );
}
