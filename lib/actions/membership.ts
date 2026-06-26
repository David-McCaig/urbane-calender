'use server';

import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { revalidatePath } from 'next/cache';
import { randomBytes } from 'crypto';
import type { MembershipRole, UserShopMembership, Invitation, Shop } from '@/lib/types/membership';

// --- Helpers ---

async function getCurrentUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error('Not authenticated');
  }
  return { supabase, user };
}

/**
 * Get the current active shop ID from the user's session metadata.
 * This reads the value that RLS also uses, so it's always consistent.
 */
export async function getCurrentShopId(): Promise<string | null> {
  try {
    const { user } = await getCurrentUser();
    return user.user_metadata?.active_shop_id ?? null;
  } catch {
    return null;
  }
}

// --- Shop Management ---

/**
 * Create a new shop and make the current user its owner.
 * Called after sign-up when the user provides a shop name.
 */
export async function createShopAndMembership(shopName: string): Promise<Shop> {
  const { user } = await getCurrentUser();
  const serviceClient = createServiceClient();

  // Create the shop (service client bypasses RLS)
  const { data: shop, error: shopError } = await serviceClient
    .from('shops')
    .insert({ name: shopName })
    .select()
    .single();

  if (shopError) {
    throw new Error(`Failed to create shop: ${shopError.message}`);
  }

  // Create owner membership (service client bypasses RLS)
  const { error: memberError } = await serviceClient
    .from('user_shop_memberships')
    .insert({
      user_id: user.id,
      shop_id: shop.id,
      role: 'owner',
    });

  if (memberError) {
    // Attempt cleanup: delete the shop we just created
    await serviceClient.from('shops').delete().eq('id', shop.id);
    throw new Error(`Failed to create membership: ${memberError.message}`);
  }

  // Auto-create a mechanic record for the new shop owner
  try {
    const mechanicName = user.user_metadata?.display_name
      || (user.email ? user.email.split('@')[0] : 'Shop Owner');
    await serviceClient.from('mechanics').insert({
      shop_id: shop.id,
      name: mechanicName,
      avatar: mechanicName.charAt(0).toUpperCase(),
      specialty: 'Shop Owner',
      is_active: true,
      user_id: user.id,
    });
  } catch (mechErr) {
    // Non-fatal — shop and membership already exist
    console.error('Failed to auto-create mechanic record:', mechErr);
  }

  // Set active shop in user_metadata so RLS picks it up on subsequent requests
  const supabase = await createClient();
  const { error: updateError } = await supabase.auth.updateUser({
    data: { active_shop_id: shop.id },
  });

  if (updateError) {
    throw new Error(`Failed to set active shop: ${updateError.message}`);
  }

  revalidatePath('/', 'layout');
  return shop;
}

/**
 * Switch the active shop for the current user.
 * Validates membership before switching.
 */
export async function switchActiveShop(shopId: string): Promise<void> {
  const { supabase, user } = await getCurrentUser();

  // Verify the user has a membership for this shop
  const { data: membership, error: membershipError } = await supabase
    .from('user_shop_memberships')
    .select('id')
    .eq('user_id', user.id)
    .eq('shop_id', shopId)
    .single();

  if (membershipError || !membership) {
    throw new Error('You are not a member of this shop');
  }

  // Update user_metadata with new active shop
  const { error: updateError } = await supabase.auth.updateUser({
    data: { active_shop_id: shopId },
  });

  if (updateError) {
    throw new Error(`Failed to switch shop: ${updateError.message}`);
  }

  revalidatePath('/', 'layout');
}

/**
 * Get the current user's role in their active shop.
 */
export async function getCurrentUserRole(): Promise<MembershipRole | null> {
  try {
    const { supabase, user } = await getCurrentUser();
    const shopId = user.user_metadata?.active_shop_id;
    if (!shopId) return null;

    const { data, error } = await supabase
      .from('user_shop_memberships')
      .select('role')
      .eq('user_id', user.id)
      .eq('shop_id', shopId)
      .single();

    if (error || !data) return null;
    return data.role as MembershipRole;
  } catch {
    return null;
  }
}

// --- Membership Management ---

/**
 * Get all members of the active shop.
 */
export async function getShopMembers(): Promise<UserShopMembership[]> {
  const { supabase, user } = await getCurrentUser();
  const shopId = user.user_metadata?.active_shop_id;
  if (!shopId) return [];

  const { data, error } = await supabase
    .from('user_shop_memberships')
    .select('*')
    .eq('shop_id', shopId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch members: ${error.message}`);
  }

  return data as UserShopMembership[];
}

/**
 * Update a member's role (owner only). Prevents demoting the last owner.
 */
export async function updateMemberRole(
  userId: string,
  role: MembershipRole
): Promise<void> {
  const { supabase, user } = await getCurrentUser();
  const shopId = user.user_metadata?.active_shop_id;
  if (!shopId) throw new Error('No active shop');

  // Verify current user is owner
  const callerRole = await getCurrentUserRole();
  if (callerRole !== 'owner') {
    throw new Error('Only the shop owner can change member roles');
  }

  // If changing away from owner, ensure this isn't the last owner
  if (role !== 'owner') {
    const { count, error: countError } = await supabase
      .from('user_shop_memberships')
      .select('*', { count: 'exact', head: true })
      .eq('shop_id', shopId)
      .eq('role', 'owner');

    if (!countError && count === 1) {
      // Check if the target user is the sole owner
      const { data: target } = await supabase
        .from('user_shop_memberships')
        .select('role')
        .eq('shop_id', shopId)
        .eq('user_id', userId)
        .single();

      if (target?.role === 'owner') {
        throw new Error('Cannot change the role of the last owner. Transfer ownership first.');
      }
    }
  }

  const { error } = await supabase
    .from('user_shop_memberships')
    .update({ role })
    .eq('shop_id', shopId)
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Failed to update role: ${error.message}`);
  }

  revalidatePath('/protected/members');
}

/**
 * Remove a member from the shop (owner only). Cannot remove yourself.
 */
export async function removeMember(userId: string): Promise<void> {
  const { supabase, user } = await getCurrentUser();
  const shopId = user.user_metadata?.active_shop_id;
  if (!shopId) throw new Error('No active shop');

  if (userId === user.id) {
    throw new Error('You cannot remove yourself. Transfer ownership first or delete the shop.');
  }

  const { error } = await supabase
    .from('user_shop_memberships')
    .delete()
    .eq('shop_id', shopId)
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Failed to remove member: ${error.message}`);
  }

  revalidatePath('/protected/members');
}

// --- Invitations ---

/**
 * Create an invitation for a new member. Returns the full invitation with token
 * so the UI can build a shareable URL.
 */
export async function createInvitation(
  email: string,
  role: MembershipRole
): Promise<{ invitation: Invitation; inviteUrl: string }> {
  const { supabase, user } = await getCurrentUser();
  const shopId = user.user_metadata?.active_shop_id;
  if (!shopId) throw new Error('No active shop');

  // Generate a secure random token
  const token = randomBytes(32).toString('hex');

  // Set expiry to 7 days from now
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const { data: invitation, error } = await supabase
    .from('invitations')
    .insert({
      shop_id: shopId,
      email: email.toLowerCase().trim(),
      role,
      token,
      expires_at: expiresAt.toISOString(),
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create invitation: ${error.message}`);
  }

  // Build the invite URL — uses NEXT_PUBLIC_SITE_URL or falls back to a relative path
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
  const inviteUrl = `${baseUrl}/auth/accept-invitation?token=${token}`;

  return { invitation: invitation as Invitation, inviteUrl };
}

/**
 * Accept an invitation using its token. The current user must be authenticated
 * and their email must match the invitation.
 */
export async function acceptInvitation(token: string): Promise<void> {
  const { user } = await getCurrentUser();
  const serviceClient = createServiceClient();

  // Find the invitation (service client bypasses RLS, which blocks non-members)
  const { data: invitation, error: invError } = await serviceClient
    .from('invitations')
    .select('*')
    .eq('token', token)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (invError || !invitation) {
    throw new Error('Invalid or expired invitation link.');
  }

  // Check email matches
  if (invitation.email !== user.email) {
    throw new Error(
      `This invitation was sent to ${invitation.email}. Your account email (${user.email}) does not match.`
    );
  }

  // Create the membership (service client bypasses RLS)
  const { error: memberError } = await serviceClient
    .from('user_shop_memberships')
    .insert({
      user_id: user.id,
      shop_id: invitation.shop_id,
      role: invitation.role,
    });

  if (memberError) {
    // If they're already a member, that's fine — just proceed
    if (!memberError.message.includes('duplicate key')) {
      throw new Error(`Failed to accept invitation: ${memberError.message}`);
    }
  }

  // Auto-create a mechanic record if one doesn't already exist
  try {
    const { data: existing } = await serviceClient
      .from('mechanics')
      .select('id')
      .eq('shop_id', invitation.shop_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!existing) {
      const mechanicName = user.user_metadata?.display_name
        || (user.email ? user.email.split('@')[0] : 'Shop Member');
      const specialty =
        invitation.role === 'mechanic' ? 'Service Writer' :
        invitation.role === 'manager' ? 'Shop Manager' : 'Shop Owner';
      await serviceClient.from('mechanics').insert({
        shop_id: invitation.shop_id,
        name: mechanicName,
        avatar: mechanicName.charAt(0).toUpperCase(),
        specialty,
        is_active: true,
        user_id: user.id,
      });
    }
  } catch (mechErr) {
    // Non-fatal — membership already exists
    console.error('Failed to auto-create mechanic record:', mechErr);
  }

  // Mark invitation as accepted (no UPDATE policy exists on invitations)
  await serviceClient
    .from('invitations')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invitation.id);

  // Set this as the active shop
  const supabase = await createClient();
  const { error: updateError } = await supabase.auth.updateUser({
    data: { active_shop_id: invitation.shop_id },
  });

  if (updateError) {
    throw new Error(`Failed to set active shop: ${updateError.message}`);
  }

  revalidatePath('/', 'layout');
}

/**
 * Get all pending invitations for the active shop.
 */
export async function getShopInvitations(): Promise<Invitation[]> {
  const { supabase, user } = await getCurrentUser();
  const shopId = user.user_metadata?.active_shop_id;
  if (!shopId) return [];

  const { data, error } = await supabase
    .from('invitations')
    .select('*')
    .eq('shop_id', shopId)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch invitations: ${error.message}`);
  }

  return data as Invitation[];
}

/**
 * Delete (cancel) a pending invitation. Owner only.
 */
export async function deleteInvitation(invitationId: string): Promise<void> {
  const { supabase, user } = await getCurrentUser();
  const shopId = user.user_metadata?.active_shop_id;
  if (!shopId) throw new Error('No active shop');

  const { error } = await supabase
    .from('invitations')
    .delete()
    .eq('id', invitationId)
    .eq('shop_id', shopId);

  if (error) {
    throw new Error(`Failed to delete invitation: ${error.message}`);
  }

  revalidatePath('/protected/members');
}

/**
 * Get all shops the current user belongs to, with the shop details.
 */
export async function getUserShops(): Promise<UserShopMembership[]> {
  const { supabase, user } = await getCurrentUser();

  const { data, error } = await supabase
    .from('user_shop_memberships')
    .select('*, shop:shops(*)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch user shops: ${error.message}`);
  }

  return data as UserShopMembership[];
}
