import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ticketsApi, commentsApi, usersApi } from '../../services/api';
import { Ticket, Comment, User } from '../../types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { PriorityBadge, StatusBadge, TypeBadge } from '../../components/ui/Badge';
import { LoadingSpinner, Avatar } from '../../components/ui/LoadingSpinner';
import { useAuthStore } from '../../store/authStore';
import { format, formatDistanceToNow } from 'date-fns';

const activityLabel = (action: string, details: any) => {
  switch (action) {
    case 'TICKET_CREATED': return 'created this ticket';
    case 'TICKET_UPDATED': return 'updated this ticket';
    case 'STATUS_CHANGED': return `changed status from ${details?.from} to ${details?.to}`;
    case 'ASSIGNEE_CHANGED': return 'changed the assignee';
    case 'COMMENT_ADDED': return 'added a comment';
    default: return action.toLowerCase().replace(/_/g, ' ');
  }
};

export const TicketDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [comment, setComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [saving, setSaving] = useState(false);

  const canManage = user?.role !== 'VIEWER';

  const fetchTicket = () => {
    if (!id) return;
    ticketsApi.getById(id)
      .then(res => {
        setTicket(res.data.ticket);
        setEditForm({
          title: res.data.ticket.title,
          description: res.data.ticket.description || '',
          type: res.data.ticket.type,
          status: res.data.ticket.status,
          priority: res.data.ticket.priority,
          assigneeId: res.data.ticket.assigneeId || '',
          startDate: res.data.ticket.startDate ? res.data.ticket.startDate.split('T')[0] : '',
          dueDate: res.data.ticket.dueDate ? res.data.ticket.dueDate.split('T')[0] : '',
        });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchTicket(); }, [id]);
  useEffect(() => { usersApi.getAll().then(res => setUsers(res.data.users)); }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await ticketsApi.update(id!, { ...editForm, assigneeId: editForm.assigneeId || null });
      toast.success('Ticket updated');
      setEditing(false);
      fetchTicket();
    } catch {
      toast.error('Failed to update ticket');
    } finally {
      setSaving(false);
    }
  };

  const handleQuickUpdate = async (field: string, value: string) => {
    try {
      await ticketsApi.update(id!, { [field]: value });
      toast.success('Updated');
      fetchTicket();
    } catch {
      toast.error('Failed to update');
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setSubmittingComment(true);
    try {
      await commentsApi.create(id!, comment);
      setComment('');
      fetchTicket();
    } catch {
      toast.error('Failed to add comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleEditComment = async (commentId: string) => {
    if (!editCommentText.trim()) return;
    try {
      await commentsApi.update(commentId, editCommentText);
      setEditingComment(null);
      fetchTicket();
    } catch {
      toast.error('Failed to update comment');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await commentsApi.delete(commentId);
      fetchTicket();
    } catch {
      toast.error('Failed to delete comment');
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!ticket) return <div className="text-center py-16 text-slate-500">Ticket not found</div>;

  const projectMembers = ticket.project ? users : users;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-5">
          {/* Header */}
          <div className="card p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-mono text-slate-400">{ticket.key}</span>
                <TypeBadge type={ticket.type} />
              </div>
              <div className="flex items-center gap-2">
                {canManage && !editing && (
                  <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Edit</Button>
                )}
                {editing && (
                  <>
                    <Button size="sm" variant="secondary" onClick={() => setEditing(false)}>Cancel</Button>
                    <Button size="sm" onClick={handleSave} loading={saving}>Save</Button>
                  </>
                )}
              </div>
            </div>

            {editing ? (
              <Input value={editForm.title}
                onChange={e => setEditForm((f: any) => ({ ...f, title: e.target.value }))}
                className="text-xl font-bold mb-4" />
            ) : (
              <h1 className="text-xl font-bold text-slate-900 mb-4">{ticket.title}</h1>
            )}

            {editing ? (
              <Textarea label="Description" value={editForm.description}
                onChange={e => setEditForm((f: any) => ({ ...f, description: e.target.value }))} />
            ) : (
              ticket.description ? (
                <p className="text-sm text-slate-600 whitespace-pre-wrap">{ticket.description}</p>
              ) : (
                <p className="text-sm text-slate-400 italic">No description provided</p>
              )
            )}
          </div>

          {/* Comments */}
          <div className="card p-6">
            <h3 className="font-semibold text-slate-900 mb-4">
              Comments ({ticket.comments?.length ?? 0})
            </h3>

            <div className="space-y-4 mb-6">
              {(ticket.comments ?? []).map((c: Comment) => (
                <div key={c.id} className="flex gap-3">
                  <Avatar name={c.author.name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-slate-900">{c.author.name}</span>
                      <span className="text-xs text-slate-400">
                        {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                      </span>
                      {c.createdAt !== c.updatedAt && (
                        <span className="text-xs text-slate-400">(edited)</span>
                      )}
                    </div>

                    {editingComment === c.id ? (
                      <div className="space-y-2">
                        <Textarea value={editCommentText}
                          onChange={e => setEditCommentText(e.target.value)} />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleEditComment(c.id)}>Save</Button>
                          <Button size="sm" variant="secondary" onClick={() => setEditingComment(null)}>Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{c.content}</p>
                    )}

                    {(c.authorId === user?.id || user?.role === 'ADMIN') && editingComment !== c.id && (
                      <div className="flex gap-3 mt-1">
                        {c.authorId === user?.id && (
                          <button
                            onClick={() => { setEditingComment(c.id); setEditCommentText(c.content); }}
                            className="text-xs text-slate-400 hover:text-blue-600"
                          >Edit</button>
                        )}
                        <button
                          onClick={() => handleDeleteComment(c.id)}
                          className="text-xs text-slate-400 hover:text-red-500"
                        >Delete</button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddComment} className="flex gap-3">
              <Avatar name={user?.name ?? ''} size="sm" />
              <div className="flex-1 space-y-2">
                <Textarea
                  placeholder="Add a comment..."
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                />
                <Button type="submit" size="sm" loading={submittingComment} disabled={!comment.trim()}>
                  Comment
                </Button>
              </div>
            </form>
          </div>

          {/* Activity */}
          {ticket.activityLogs && ticket.activityLogs.length > 0 && (
            <div className="card p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Activity</h3>
              <div className="space-y-3">
                {ticket.activityLogs.map(log => (
                  <div key={log.id} className="flex items-start gap-3">
                    <Avatar name={log.user.name} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-700">
                        <span className="font-medium">{log.user.name}</span>{' '}
                        <span className="text-slate-500">{activityLabel(log.action, log.details)}</span>
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Details</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-500 font-medium">Status</label>
                {canManage ? (
                  <Select
                    value={ticket.status}
                    onChange={e => handleQuickUpdate('status', e.target.value)}
                    options={[
                      { value: 'BACKLOG', label: 'Backlog' },
                      { value: 'TODO', label: 'To Do' },
                      { value: 'IN_PROGRESS', label: 'In Progress' },
                      { value: 'IN_REVIEW', label: 'In Review' },
                      { value: 'DONE', label: 'Done' },
                    ]}
                    className="mt-1"
                  />
                ) : (
                  <div className="mt-1"><StatusBadge status={ticket.status} /></div>
                )}
              </div>

              <div>
                <label className="text-xs text-slate-500 font-medium">Priority</label>
                {canManage ? (
                  <Select
                    value={ticket.priority}
                    onChange={e => handleQuickUpdate('priority', e.target.value)}
                    options={[
                      { value: 'HIGHEST', label: 'Highest' },
                      { value: 'HIGH', label: 'High' },
                      { value: 'MEDIUM', label: 'Medium' },
                      { value: 'LOW', label: 'Low' },
                    ]}
                    className="mt-1"
                  />
                ) : (
                  <div className="mt-1"><PriorityBadge priority={ticket.priority} /></div>
                )}
              </div>

              <div>
                <label className="text-xs text-slate-500 font-medium">Assignee</label>
                {canManage ? (
                  <Select
                    value={ticket.assigneeId || ''}
                    onChange={e => handleQuickUpdate('assigneeId', e.target.value)}
                    placeholder="Unassigned"
                    options={users.filter(u => u.isActive).map(u => ({ value: u.id, label: u.name }))}
                    className="mt-1"
                  />
                ) : (
                  <div className="mt-1 flex items-center gap-2">
                    {ticket.assignee ? (
                      <>
                        <Avatar name={ticket.assignee.name} size="sm" />
                        <span className="text-sm text-slate-700">{ticket.assignee.name}</span>
                      </>
                    ) : (
                      <span className="text-sm text-slate-400">Unassigned</span>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs text-slate-500 font-medium">Reporter</label>
                <div className="mt-1 flex items-center gap-2">
                  <Avatar name={ticket.reporter.name} size="sm" />
                  <span className="text-sm text-slate-700">{ticket.reporter.name}</span>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-500 font-medium">Project</label>
                <p className="text-sm text-slate-700 mt-1">{ticket.project.name}</p>
              </div>

              <div>
                <label className="text-xs text-slate-500 font-medium">Start Date</label>
                {canManage ? (
                  <Input
                    type="date"
                    value={ticket.startDate ? ticket.startDate.split('T')[0] : ''}
                    onChange={e => handleQuickUpdate('startDate', e.target.value)}
                    className="mt-1"
                  />
                ) : ticket.startDate ? (
                  <p className="text-sm text-slate-700 mt-1">{format(new Date(ticket.startDate), 'MMM d, yyyy')}</p>
                ) : (
                  <p className="text-sm text-slate-400 mt-1">Not set</p>
                )}
              </div>

              <div>
                <label className="text-xs text-slate-500 font-medium">Due Date</label>
                {canManage ? (
                  <Input
                    type="date"
                    value={ticket.dueDate ? ticket.dueDate.split('T')[0] : ''}
                    onChange={e => handleQuickUpdate('dueDate', e.target.value)}
                    className="mt-1"
                  />
                ) : ticket.dueDate ? (
                  <p className="text-sm text-slate-700 mt-1">{format(new Date(ticket.dueDate), 'MMM d, yyyy')}</p>
                ) : (
                  <p className="text-sm text-slate-400 mt-1">Not set</p>
                )}
              </div>

              <div>
                <label className="text-xs text-slate-500 font-medium">Created</label>
                <p className="text-sm text-slate-700 mt-1">
                  {format(new Date(ticket.createdAt), 'MMM d, yyyy')}
                </p>
              </div>

              <div>
                <label className="text-xs text-slate-500 font-medium">Updated</label>
                <p className="text-sm text-slate-700 mt-1">
                  {formatDistanceToNow(new Date(ticket.updatedAt), { addSuffix: true })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
