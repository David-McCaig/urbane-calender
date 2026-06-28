'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  updateMemberRole,
  removeMember,
  createInvitation,
  deleteInvitation,
} from '@/lib/actions/membership';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Trash2,
  UserMinus,
  Shield,
  Mail,
  Copy,
  Check,
  Users,
  UserPlus,
} from 'lucide-react';
import type {
  MembershipRole,
  UserShopMembership,
  Invitation,
} from '@/lib/types/membership';

interface MembersClientProps {
  members: UserShopMembership[];
  invitations: Invitation[];
  currentUserId: string;
  currentRole: string | null;
  shopId: string;
}

// shopId is available to child components via props if needed
const ROLE_LABELS: Record<MembershipRole, string> = {
  owner: 'Owner',
  manager: 'Manager',
  mechanic: 'Mechanic',
};

const ROLE_BADGE_VARIANT: Record<
  MembershipRole,
  'default' | 'secondary' | 'outline'
> = {
  owner: 'default',
  manager: 'secondary',
  mechanic: 'outline',
};

const ROLE_OPTIONS: MembershipRole[] = ['mechanic', 'manager', 'owner'];

export function MembersClient({
  members,
  invitations,
  currentUserId,
  currentRole,
}: MembersClientProps) {
  const router = useRouter();
  const canManage = currentRole === 'owner' || currentRole === 'manager';
  const isOwner = currentRole === 'owner';

  // Invitation form state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<MembershipRole>('mechanic');
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Role update state
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);

  const handleCreateInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);
    setInviteUrl(null);
    setInviteLoading(true);

    try {
      const result = await createInvitation(inviteEmail.trim(), inviteRole);
      setInviteUrl(result.inviteUrl);
      setInviteEmail('');
      router.refresh();
    } catch (err: unknown) {
      setInviteError(
        err instanceof Error ? err.message : 'Failed to create invitation'
      );
    } finally {
      setInviteLoading(false);
    }
  };

  const handleCopyUrl = async () => {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRoleChange = async (userId: string, role: MembershipRole) => {
    setRoleError(null);
    setUpdatingUser(userId);

    try {
      await updateMemberRole(userId, role);
      router.refresh();
    } catch (err: unknown) {
      setRoleError(
        err instanceof Error ? err.message : 'Failed to update role'
      );
    } finally {
      setUpdatingUser(null);
    }
  };

  const handleRemove = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return;

    try {
      await removeMember(userId);
      router.refresh();
    } catch (err: unknown) {
      alert(
        err instanceof Error ? err.message : 'Failed to remove member'
      );
    }
  };

  const handleDeleteInvitation = async (invitationId: string) => {
    try {
      await deleteInvitation(invitationId);
      router.refresh();
    } catch (err: unknown) {
      alert(
        err instanceof Error ? err.message : 'Failed to cancel invitation'
      );
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6" />
          Members
        </h1>
        <p className="text-gray-500 mt-1">
          Manage who has access to your shop
        </p>
      </div>

      {roleError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
          {roleError}
        </div>
      )}

      {/* Members List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Current Members</CardTitle>
          <CardDescription>
            {members.length} member{members.length !== 1 ? 's' : ''} in this
            shop
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {members.map((member) => {
              const isCurrentUser = member.user_id === currentUserId;
              const isLastOwner =
                isOwner &&
                member.role === 'owner' &&
                members.filter((m) => m.role === 'owner').length === 1;

              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-sm font-medium">
                      {member.user_id.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium flex items-center gap-2">
                        {member.user_id.slice(0, 8)}...
                        {isCurrentUser && (
                          <span className="text-xs text-gray-400">(you)</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500">
                        Joined {new Date(member.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {canManage && !isLastOwner ? (
                      <Select
                        value={member.role}
                        onValueChange={(value: MembershipRole) =>
                          handleRoleChange(member.user_id, value)
                        }
                        disabled={updatingUser === member.user_id}
                      >
                        <SelectTrigger className="h-8 w-[110px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLE_OPTIONS.map((role) => (
                            <SelectItem key={role} value={role}>
                              {ROLE_LABELS[role]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge
                        variant={ROLE_BADGE_VARIANT[member.role] || 'outline'}
                      >
                        <Shield className="h-3 w-3 mr-1" />
                        {ROLE_LABELS[member.role]}
                      </Badge>
                    )}

                    {isOwner && !isCurrentUser && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleRemove(member.user_id)}
                      >
                        <UserMinus className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Invitation Form */}
      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Invite Member
            </CardTitle>
            <CardDescription>
              Generate an invitation link to share with new members
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateInvitation} className="space-y-4">
              <div className="flex gap-3 items-end">
                <div className="flex-1 grid gap-2">
                  <Label htmlFor="invite-email">Email address</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    required
                    placeholder="mechanic@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="invite-role">Role</Label>
                  <Select
                    value={inviteRole}
                    onValueChange={(value: MembershipRole) =>
                      setInviteRole(value)
                    }
                  >
                    <SelectTrigger className="h-9 w-[130px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mechanic">Mechanic</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="owner">Owner</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" disabled={inviteLoading}>
                  <Mail className="h-4 w-4 mr-2" />
                  {inviteLoading ? 'Generating...' : 'Generate Link'}
                </Button>
              </div>

              {inviteError && (
                <p className="text-sm text-red-500">{inviteError}</p>
              )}

              {inviteUrl && (
                <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md">
                  <p className="text-sm font-medium mb-2">
                    Share this link with the invitee:
                  </p>
                  <div className="flex items-center gap-2">
                    <Input
                      value={inviteUrl}
                      readOnly
                      className="text-xs font-mono"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCopyUrl}
                      className="shrink-0"
                    >
                      {copied ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    This link expires in 7 days.
                  </p>
                </div>
              )}
            </form>

            {/* Pending Invitations */}
            {invitations.length > 0 && (
              <div className="mt-6 border-t pt-4">
                <h4 className="text-sm font-medium mb-2">
                  Pending Invitations ({invitations.length})
                </h4>
                <div className="space-y-2">
                  {invitations.map((inv) => (
                    <div
                      key={inv.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <div>
                        <span>{inv.email}</span>
                        <Badge variant="outline" className="ml-2 text-xs">
                          {ROLE_LABELS[inv.role]}
                        </Badge>
                        <span className="text-xs text-gray-400 ml-2">
                          Expires{' '}
                          {new Date(inv.expires_at).toLocaleDateString()}
                        </span>
                      </div>
                      {isOwner && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-gray-400 hover:text-red-500"
                          onClick={() => handleDeleteInvitation(inv.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
