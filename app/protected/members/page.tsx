import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  resolveActiveShop,
  getCurrentUserRole,
  getShopMembers,
  getShopInvitations,
} from '@/lib/actions/membership';
import { MembersClient } from './members-client';
import type { MembershipRole, MemberRow } from '@/lib/types/membership';

export default async function MembersPage() {
  let shopId: string | null;
  try {
    shopId = await resolveActiveShop();
  } catch {
    redirect('/auth/login');
  }

  if (!shopId) {
    redirect('/onboarding');
  }

  // Get current user's role, all members, and invitations via shared helpers
  const [currentRole, members, invitations] = await Promise.all([
    getCurrentUserRole(),
    getShopMembers(),
    getShopInvitations(),
  ]);

  // Get the current user's ID for the isCurrentUser flag in row assembly
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch mechanic profiles for all member user_ids (to get display names)
  const memberUserIds = members.map((m) => m.user_id);
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

  // Build unified rows
  const rows: MemberRow[] = [];

  // Add active members
  for (const member of members) {
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
      isCurrentUser: member.user_id === user?.id,
      userId: member.user_id,
      invitationId: null,
    });
  }

  // Add pending invitations
  for (const inv of invitations) {
    rows.push({
      id: inv.id,
      name: inv.email,
      email: inv.email,
      role: inv.role as MembershipRole,
      status: 'pending',
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
