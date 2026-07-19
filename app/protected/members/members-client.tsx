'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getErrorMessage } from '@/lib/error-utils';
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
  Clock,
} from 'lucide-react';
import type { MembershipRole, MemberRow } from '@/lib/types/membership';

interface MembersClientProps {
  rows: MemberRow[];
  currentRole: MembershipRole | null;
  shopId: string;
}

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

const STATUS_STYLES: Record<MemberRow['status'], { label: string; className: string }> = {
  active: { label: 'Active', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
  expired: { label: 'Expired', className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
};

export function MembersClient({
  rows,
  currentRole,
}: MembersClientProps) {
  const router = useRouter();
  const canManage = currentRole === 'owner' || currentRole === 'manager';
  const isOwner = currentRole === 'owner';

  // Invitation form state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<MembershipRole>('mechanic');
  const [inviteResult, setInviteResult] = useState<{ inviteUrl: string; emailSent: boolean; email: string } | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Role update state
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);

  const activeCount = rows.filter((r) => r.status === 'active').length;
  const pendingCount = rows.filter((r) => r.status === 'pending').length;

  const handleCreateInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);
    setInviteResult(null);
    setInviteLoading(true);

    try {
      const result = await createInvitation(inviteEmail.trim(), inviteRole);
      setInviteResult({ inviteUrl: result.inviteUrl, emailSent: result.emailSent, email: inviteEmail.trim() });
      setInviteEmail('');
      router.refresh();
    } catch (err: unknown) {
      setInviteError(
        getErrorMessage(err, 'Failed to create invitation')
      );
    } finally {
      setInviteLoading(false);
    }
  };

  const handleCopyUrl = async () => {
    if (!inviteResult?.inviteUrl) return;
    await navigator.clipboard.writeText(inviteResult.inviteUrl);
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
        getErrorMessage(err, 'Failed to update role')
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
        getErrorMessage(err, 'Failed to remove member')
      );
    }
  };

  const handleDeleteInvitation = async (invitationId: string) => {
    try {
      await deleteInvitation(invitationId);
      router.refresh();
    } catch (err: unknown) {
      alert(
        getErrorMessage(err, 'Failed to cancel invitation')
      );
    }
  };

  const isLastOwner = (row: MemberRow) =>
    isOwner &&
    row.role === 'owner' &&
    rows.filter((r) => r.role === 'owner' && r.status === 'active').length === 1;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            Members
          </h1>
          <p className="text-gray-500 mt-1">
            {activeCount} active member{activeCount !== 1 ? 's' : ''}
            {pendingCount > 0 && ` · ${pendingCount} pending`}
          </p>
        </div>
      </div>

      {roleError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
          {roleError}
        </div>
      )}

      {/* Invite Form */}
      {canManage && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Invite Member
            </CardTitle>
            <CardDescription>
              Send an invitation email to add someone to your shop
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
                  {inviteLoading ? 'Sending...' : 'Send Invitation'}
                </Button>
              </div>

              {inviteError && (
                <p className="text-sm text-red-500">{inviteError}</p>
              )}

              {inviteResult && (inviteResult.emailSent ? (
                <div className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-md">
                  <p className="text-sm font-medium text-green-800 dark:text-green-200">
                    Invitation sent!
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                    An email with the sign-up link has been sent to{' '}
                    <strong>{inviteResult.email}</strong>.
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md">
                  <p className="text-sm font-medium mb-1 text-amber-700 dark:text-amber-400">
                    Email could not be sent. Share this link manually:
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Input
                      value={inviteResult.inviteUrl}
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
                </div>
              ))}
            </form>
          </CardContent>
        </Card>
      )}

      {/* Members Table */}
      <Card>
        <CardContent className="p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b text-xs text-gray-500 uppercase tracking-wider">
                <th className="text-left font-medium px-4 py-3">Name</th>
                <th className="text-left font-medium px-4 py-3 w-[120px]">Role</th>
                <th className="text-left font-medium px-4 py-3 w-[100px]">Status</th>
                <th className="text-left font-medium px-4 py-3 w-[130px]">Joined</th>
                <th className="text-right font-medium px-4 py-3 w-[60px]"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center text-gray-400 py-12">
                    No members yet. Invite someone to get started.
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const isCurrentUser = row.isCurrentUser;
                  const isLastOwnerRow = isLastOwner(row);

                  return (
                    <tr
                      key={row.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
                    >
                      {/* Name + Avatar */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs font-medium shrink-0">
                            {row.avatar}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate flex items-center gap-2">
                              {row.name}
                              {isCurrentUser && (
                                <span className="text-xs text-gray-400 font-normal">(you)</span>
                              )}
                            </p>
                            {row.email && (
                              <p className="text-xs text-gray-400 truncate">
                                {row.email}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-4 py-3">
                        {row.status === 'active' && canManage && !isLastOwnerRow ? (
                          <Select
                            value={row.role}
                            onValueChange={(value: MembershipRole) =>
                              handleRoleChange(row.userId!, value)
                            }
                            disabled={updatingUser === row.userId}
                          >
                            <SelectTrigger className="h-7 w-[110px] text-xs">
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
                            variant={ROLE_BADGE_VARIANT[row.role] || 'outline'}
                            className="text-xs"
                          >
                            <Shield className="h-3 w-3 mr-1" />
                            {ROLE_LABELS[row.role]}
                          </Badge>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[row.status].className}`}
                        >
                          {row.status === 'pending' && <Clock className="h-3 w-3" />}
                          {STATUS_STYLES[row.status].label}
                        </span>
                      </td>

                      {/* Joined / Expires */}
                      <td className="px-4 py-3">
                        {row.joinedAt ? (
                          <span className="text-xs text-gray-500">
                            {new Date(row.joinedAt).toLocaleDateString()}
                          </span>
                        ) : row.expiresAt ? (
                          <span className="text-xs text-gray-500">
                            Expires {new Date(row.expiresAt).toLocaleDateString()}
                          </span>
                        ) : null}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        {row.status === 'active' && isOwner && !isCurrentUser && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-gray-400 hover:text-red-500"
                            onClick={() => handleRemove(row.userId!)}
                            title="Remove member"
                          >
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        )}
                        {(row.status === 'pending' || row.status === 'expired') &&
                          isOwner && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-gray-400 hover:text-red-500"
                              onClick={() => handleDeleteInvitation(row.invitationId!)}
                              title="Cancel invitation"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
