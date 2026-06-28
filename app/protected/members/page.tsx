import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { MembersClient } from './members-client';
import type { MembershipRole, MemberRow } from '@/lib/types/membership';

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

  const currentRole = (currentMember?.role as MembershipRole) || null;

  // Get all members for this shop
  const { data: members } = await supabase
    .from('user_shop_memberships')
    .select('*')
    .eq('shop_id', shopId)
    .order('created_at', { ascending: true });

  // Fetch mechanic profiles for all member user_ids (to get display names)
  const memberUserIds = (members || []).map((m) => m.user_id);
  const mechanicMap = new Map<string, { name: string; avatar: string }>();
  if (memberUserIds.length > 0) {
    const { data: mechanics } = await supabase
      .from('mechanics')
      .select('user_id, name, avatar')
      .eq('shop_id', shopId)
      .in('user_id', memberUserIds);
    for (const mech of mechanics || []) {
      mechanicMap.set(mech.user_id, { name: mech.name, avatar: mech.avatar });
    }
  }

  // Get all invitations for this shop (including accepted and expired)
  const { data: invitations } = await supabase
    .from('invitations')
    .select('*')
    .eq('shop_id', shopId)
    .order('created_at', { ascending: false });

  // Build unified rows
  const rows: MemberRow[] = [];

  // Add active members
  for (const member of members || []) {
    const mech = mechanicMap.get(member.user_id);
    rows.push({
      id: member.id,
      name: mech?.name || member.user_id.slice(0, 8),
      email: null,
      role: member.role as MembershipRole,
      status: 'active',
      avatar: mech?.avatar || member.user_id.slice(0, 1).toUpperCase(),
      joinedAt: member.created_at,
      expiresAt: null,
      isCurrentUser: member.user_id === user.id,
      userId: member.user_id,
      invitationId: null,
    });
  }

  // Add invitations (pending and expired, not yet accepted)
  const now = new Date();
  for (const inv of invitations || []) {
    if (inv.accepted_at) continue; // already a member

    const isExpired = new Date(inv.expires_at) < now;
    rows.push({
      id: inv.id,
      name: inv.email,
      email: inv.email,
      role: inv.role as MembershipRole,
      status: isExpired ? 'expired' : 'pending',
      avatar: inv.email.charAt(0).toUpperCase(),
      joinedAt: null,
      expiresAt: inv.expires_at,
      isCurrentUser: false,
      userId: null,
      invitationId: inv.id,
    });
  }

  return (
    <MembersClient
      rows={rows}
      currentRole={currentRole}
      shopId={shopId}
    />
  );
}
