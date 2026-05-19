import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { profileApi } from '../../services/api';
import { ProfileChangeRequest } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Input';
import { Badge, RoleBadge } from '../../components/ui/Badge';
import { Avatar, LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { format, formatDistanceToNow } from 'date-fns';

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, { variant: 'warning' | 'success' | 'danger'; label: string }> = {
    PENDING:  { variant: 'warning', label: 'Pending approval' },
    APPROVED: { variant: 'success', label: 'Approved' },
    REJECTED: { variant: 'danger',  label: 'Rejected' },
  };
  const { variant, label } = map[status] ?? { variant: 'warning', label: status };
  return <Badge variant={variant}>{label}</Badge>;
};

export const ProfilePage: React.FC = () => {
  const { user, fetchMe } = useAuthStore();
  const [profile, setProfile]               = useState<any>(null);
  const [pendingRequest, setPendingRequest]   = useState<ProfileChangeRequest | null>(null);
  const [latestRequest, setLatestRequest]     = useState<ProfileChangeRequest | null>(null);
  const [loading, setLoading]               = useState(true);

  // edit form
  const [editForm, setEditForm] = useState({ name: '', email: '', bio: '' });
  const [submitting, setSubmitting] = useState(false);

  // password form
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [changingPw, setChangingPw] = useState(false);

  const fetchProfile = async () => {
    try {
      const res = await profileApi.getMyProfile();
      setProfile(res.data.user);
      setPendingRequest(res.data.pendingRequest);
      setLatestRequest(res.data.latestRequest);
      setEditForm({
        name:  res.data.user.name,
        email: res.data.user.email,
        bio:   res.data.user.bio || '',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProfile(); }, []);

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    const changes: any = {};
    if (editForm.name  !== profile.name)  changes.name  = editForm.name;
    if (editForm.email !== profile.email) changes.email = editForm.email;
    if (editForm.bio   !== (profile.bio || '')) changes.bio = editForm.bio;

    if (Object.keys(changes).length === 0) {
      toast('No changes detected.');
      return;
    }

    setSubmitting(true);
    try {
      await profileApi.submitChangeRequest(changes);
      toast.success('Request submitted! An admin will review it shortly.');
      fetchProfile();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirm) {
      toast.error('New passwords do not match');
      return;
    }
    setChangingPw(true);
    try {
      await profileApi.changePassword({
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      });
      toast.success('Password changed successfully!');
      setPwForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to change password');
    } finally {
      setChangingPw(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!profile) return null;

  const hasPending = !!pendingRequest;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">My Profile</h2>
        <p className="text-sm text-slate-500 mt-0.5">View and request changes to your profile</p>
      </div>

      {/* Current profile card */}
      <div className="card p-6 flex items-start gap-5">
        <Avatar name={profile.name} size="lg" avatar={profile.avatar} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-lg font-bold text-slate-900">{profile.name}</h3>
            <RoleBadge role={profile.role} />
          </div>
          <p className="text-sm text-slate-500">{profile.email}</p>
          {profile.bio && <p className="text-sm text-slate-600 mt-2">{profile.bio}</p>}
          <p className="text-xs text-slate-400 mt-2">
            Member since {format(new Date(profile.createdAt), 'MMMM d, yyyy')}
          </p>
        </div>
      </div>

      {/* Latest request status */}
      {latestRequest && (
        <div className={`card p-4 border-l-4 ${
          latestRequest.status === 'PENDING'  ? 'border-amber-400 bg-amber-50' :
          latestRequest.status === 'APPROVED' ? 'border-green-400 bg-green-50' :
                                                'border-red-400 bg-red-50'
        }`}>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold text-slate-800">Change Request</span>
                <StatusBadge status={latestRequest.status} />
              </div>
              <div className="text-xs text-slate-600 space-y-0.5">
                {latestRequest.requestedName  && <p>Name → <span className="font-medium">{latestRequest.requestedName}</span></p>}
                {latestRequest.requestedEmail && <p>Email → <span className="font-medium">{latestRequest.requestedEmail}</span></p>}
                {latestRequest.requestedBio   !== undefined && latestRequest.requestedBio !== null &&
                  <p>Bio → <span className="font-medium">{latestRequest.requestedBio || '(cleared)'}</span></p>}
              </div>
              {latestRequest.adminNote && (
                <p className="text-xs text-slate-500 mt-1 italic">Admin note: "{latestRequest.adminNote}"</p>
              )}
            </div>
            <span className="text-xs text-slate-400 shrink-0 ml-4">
              {formatDistanceToNow(new Date(latestRequest.createdAt), { addSuffix: true })}
            </span>
          </div>
        </div>
      )}

      {/* Edit form */}
      <div className="card p-6">
        <h3 className="font-semibold text-slate-900 mb-1">Request Profile Changes</h3>
        <p className="text-sm text-slate-500 mb-5">
          Changes require admin approval before taking effect.
          {hasPending && <span className="text-amber-600 font-medium"> You have a pending request — submitting again will replace it.</span>}
        </p>

        <form onSubmit={handleSubmitRequest} className="space-y-4">
          <Input
            label="Full Name"
            value={editForm.name}
            onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
            required
          />
          <Input
            label="Email Address"
            type="email"
            value={editForm.email}
            onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
            required
          />
          <Textarea
            label="Bio (optional)"
            placeholder="A short bio about yourself..."
            value={editForm.bio}
            onChange={e => setEditForm(f => ({ ...f, bio: e.target.value }))}
          />
          <div className="flex justify-end">
            <Button type="submit" loading={submitting}>
              Submit for Approval
            </Button>
          </div>
        </form>
      </div>

      {/* Password change */}
      <div className="card p-6">
        <h3 className="font-semibold text-slate-900 mb-1">Change Password</h3>
        <p className="text-sm text-slate-500 mb-5">Password changes take effect immediately — no approval needed.</p>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <Input
            label="Current Password"
            type="password"
            placeholder="••••••••"
            value={pwForm.currentPassword}
            onChange={e => setPwForm(f => ({ ...f, currentPassword: e.target.value }))}
            required
          />
          <Input
            label="New Password"
            type="password"
            placeholder="Min. 6 characters"
            value={pwForm.newPassword}
            onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))}
            required
            minLength={6}
          />
          <Input
            label="Confirm New Password"
            type="password"
            placeholder="••••••••"
            value={pwForm.confirm}
            onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
            required
          />
          <div className="flex justify-end">
            <Button type="submit" loading={changingPw} variant="secondary">
              Change Password
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
