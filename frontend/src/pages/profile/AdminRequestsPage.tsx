import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { profileApi } from '../../services/api';
import { ProfileChangeRequest } from '../../types';
import { Button } from '../../components/ui/Button';
import { Textarea } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { Avatar, LoadingSpinner, EmptyState } from '../../components/ui/LoadingSpinner';
import { formatDistanceToNow } from 'date-fns';

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, { variant: 'warning' | 'success' | 'danger'; label: string }> = {
    PENDING:  { variant: 'warning', label: 'Pending' },
    APPROVED: { variant: 'success', label: 'Approved' },
    REJECTED: { variant: 'danger',  label: 'Rejected' },
  };
  const { variant, label } = map[status] ?? { variant: 'warning', label: status };
  return <Badge variant={variant}>{label}</Badge>;
};

export const AdminRequestsPage: React.FC = () => {
  const [requests, setRequests]       = useState<ProfileChangeRequest[]>([]);
  const [loading, setLoading]         = useState(true);
  const [filter, setFilter]           = useState<string>('PENDING');
  const [actionTarget, setActionTarget] = useState<{ request: ProfileChangeRequest; type: 'approve' | 'reject' } | null>(null);
  const [adminNote, setAdminNote]     = useState('');
  const [processing, setProcessing]   = useState(false);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await profileApi.getAllRequests(filter || undefined);
      setRequests(res.data.requests);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRequests(); }, [filter]);

  const handleAction = async () => {
    if (!actionTarget) return;
    setProcessing(true);
    try {
      if (actionTarget.type === 'approve') {
        await profileApi.approveRequest(actionTarget.request.id, adminNote);
        toast.success('Request approved — profile updated!');
      } else {
        await profileApi.rejectRequest(actionTarget.request.id, adminNote);
        toast.success('Request rejected.');
      }
      setActionTarget(null);
      setAdminNote('');
      fetchRequests();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Action failed');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Profile Change Requests</h2>
        <p className="text-sm text-slate-500 mt-0.5">Review and approve or reject user profile update requests</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        {[
          { value: 'PENDING',  label: 'Pending' },
          { value: 'APPROVED', label: 'Approved' },
          { value: 'REJECTED', label: 'Rejected' },
          { value: '',         label: 'All' },
        ].map(tab => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              filter === tab.value
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? <LoadingSpinner /> : requests.length === 0 ? (
        <EmptyState
          title="No requests found"
          description={filter === 'PENDING' ? 'No pending requests — you\'re all caught up!' : 'No requests match this filter.'}
        />
      ) : (
        <div className="space-y-3">
          {requests.map(req => (
            <div key={req.id} className="card p-5">
              <div className="flex items-start gap-4">
                {/* User info */}
                <Avatar name={req.user?.name ?? '?'} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className="font-semibold text-slate-900">{req.user?.name}</span>
                    <span className="text-sm text-slate-400">{req.user?.email}</span>
                    <StatusBadge status={req.status} />
                    <span className="text-xs text-slate-400 ml-auto">
                      {formatDistanceToNow(new Date(req.createdAt), { addSuffix: true })}
                    </span>
                  </div>

                  {/* Requested changes */}
                  <div className="bg-slate-50 rounded-lg p-3 text-sm space-y-1.5 mb-3">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Requested Changes</p>
                    {req.requestedName && (
                      <div className="flex gap-2">
                        <span className="text-slate-500 w-14 shrink-0">Name</span>
                        <span className="text-slate-400 line-through">{req.user?.name}</span>
                        <span className="text-slate-400">→</span>
                        <span className="font-medium text-slate-800">{req.requestedName}</span>
                      </div>
                    )}
                    {req.requestedEmail && (
                      <div className="flex gap-2">
                        <span className="text-slate-500 w-14 shrink-0">Email</span>
                        <span className="text-slate-400 line-through">{req.user?.email}</span>
                        <span className="text-slate-400">→</span>
                        <span className="font-medium text-slate-800">{req.requestedEmail}</span>
                      </div>
                    )}
                    {req.requestedBio !== undefined && req.requestedBio !== null && (
                      <div className="flex gap-2">
                        <span className="text-slate-500 w-14 shrink-0">Bio</span>
                        <span className="font-medium text-slate-800">{req.requestedBio || '(cleared)'}</span>
                      </div>
                    )}
                  </div>

                  {/* Admin note if reviewed */}
                  {req.adminNote && (
                    <p className="text-xs text-slate-500 italic mb-3">
                      Admin note: "{req.adminNote}"
                      {req.reviewedBy && <span className="not-italic"> — {req.reviewedBy.name}</span>}
                    </p>
                  )}

                  {/* Actions */}
                  {req.status === 'PENDING' && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => { setActionTarget({ request: req, type: 'approve' }); setAdminNote(''); }}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => { setActionTarget({ request: req, type: 'reject' }); setAdminNote(''); }}
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Approve / Reject confirmation modal */}
      <Modal
        isOpen={!!actionTarget}
        onClose={() => setActionTarget(null)}
        title={actionTarget?.type === 'approve' ? 'Approve Request' : 'Reject Request'}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setActionTarget(null)}>Cancel</Button>
            <Button
              variant={actionTarget?.type === 'approve' ? 'primary' : 'danger'}
              onClick={handleAction}
              loading={processing}
            >
              {actionTarget?.type === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            {actionTarget?.type === 'approve'
              ? "This will immediately update the user's profile with the requested changes."
              : "The user's profile will remain unchanged."}
          </p>
          <Textarea
            label="Note to user (optional)"
            placeholder={actionTarget?.type === 'approve' ? 'e.g. Approved, looks good!' : 'e.g. Email already in use by another account.'}
            value={adminNote}
            onChange={e => setAdminNote(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
};
