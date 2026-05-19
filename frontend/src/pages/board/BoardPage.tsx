import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import toast from 'react-hot-toast';
import { ticketsApi, projectsApi } from '../../services/api';
import { Ticket, KanbanColumn, TicketStatus, Project } from '../../types';
import { PriorityBadge, TypeBadge } from '../../components/ui/Badge';
import { LoadingSpinner, EmptyState, Avatar } from '../../components/ui/LoadingSpinner';
import { Select } from '../../components/ui/Select';

const COLUMNS: { id: TicketStatus; label: string; color: string }[] = [
  { id: 'BACKLOG', label: 'Backlog', color: 'bg-slate-100' },
  { id: 'TODO', label: 'To Do', color: 'bg-blue-50' },
  { id: 'IN_PROGRESS', label: 'In Progress', color: 'bg-amber-50' },
  { id: 'IN_REVIEW', label: 'In Review', color: 'bg-purple-50' },
  { id: 'DONE', label: 'Done', color: 'bg-green-50' },
];

const columnHeaderColors: Record<TicketStatus, string> = {
  BACKLOG: 'border-slate-300 text-slate-600',
  TODO: 'border-blue-400 text-blue-700',
  IN_PROGRESS: 'border-amber-400 text-amber-700',
  IN_REVIEW: 'border-purple-400 text-purple-700',
  DONE: 'border-green-400 text-green-700',
};

const TicketCard: React.FC<{ ticket: Ticket; index: number }> = ({ ticket, index }) => (
  <Draggable draggableId={ticket.id} index={index}>
    {(provided, snapshot) => (
      <div
        ref={provided.innerRef}
        {...provided.draggableProps}
        {...provided.dragHandleProps}
        className={`bg-white rounded-lg border border-slate-200 p-3 mb-2 shadow-sm cursor-pointer
          hover:border-blue-300 hover:shadow-md transition-all
          ${snapshot.isDragging ? 'shadow-lg rotate-1 border-blue-400' : ''}
        `}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono text-slate-400">{ticket.key}</span>
          <TypeBadge type={ticket.type} />
        </div>
        <Link to={`/tickets/${ticket.id}`} onClick={e => e.stopPropagation()}>
          <p className="text-sm font-medium text-slate-800 mb-2 line-clamp-2 hover:text-blue-600">
            {ticket.title}
          </p>
        </Link>
        <div className="flex items-center justify-between">
          <PriorityBadge priority={ticket.priority} />
          {ticket.assignee && (
            <Avatar name={ticket.assignee.name} size="sm" />
          )}
        </div>
      </div>
    )}
  </Draggable>
);

export const BoardPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [columns, setColumns] = useState<KanbanColumn>({
    BACKLOG: [], TODO: [], IN_PROGRESS: [], IN_REVIEW: [], DONE: [],
  });
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState(searchParams.get('projectId') || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    projectsApi.getAll().then(res => {
      const activeProjects = res.data.projects.filter((p: Project) => p.status === 'ACTIVE');
      setProjects(activeProjects);
      if (!selectedProject && activeProjects.length > 0) {
        setSelectedProject(activeProjects[0].id);
      }
    });
  }, []);

  useEffect(() => {
    if (!selectedProject) return;
    setLoading(true);
    ticketsApi.getKanban(selectedProject)
      .then(res => setColumns(res.data.columns))
      .finally(() => setLoading(false));
  }, [selectedProject]);

  const handleDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const srcCol = source.droppableId as TicketStatus;
    const dstCol = destination.droppableId as TicketStatus;

    // Optimistic update
    const newColumns = { ...columns };
    const ticket = newColumns[srcCol][source.index];
    newColumns[srcCol] = newColumns[srcCol].filter((_, i) => i !== source.index);
    const updatedTicket = { ...ticket, status: dstCol };
    newColumns[dstCol] = [
      ...newColumns[dstCol].slice(0, destination.index),
      updatedTicket,
      ...newColumns[dstCol].slice(destination.index),
    ];
    setColumns(newColumns);

    try {
      await ticketsApi.updateStatus(draggableId, { status: dstCol, position: destination.index });
    } catch {
      toast.error('Failed to update ticket status');
      // Revert on failure
      if (selectedProject) {
        ticketsApi.getKanban(selectedProject).then(res => setColumns(res.data.columns));
      }
    }
  };

  const handleProjectChange = (projectId: string) => {
    setSelectedProject(projectId);
    setSearchParams({ projectId });
  };

  const totalTickets = Object.values(columns).reduce((sum, col) => sum + col.length, 0);

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Kanban Board</h2>
          <p className="text-sm text-slate-500 mt-0.5">{totalTickets} tickets</p>
        </div>
        <div className="w-56">
          <Select
            placeholder="Select project"
            value={selectedProject}
            onChange={e => handleProjectChange(e.target.value)}
            options={projects.map(p => ({ value: p.id, label: p.name }))}
          />
        </div>
      </div>

      {!selectedProject ? (
        <EmptyState title="Select a project" description="Choose a project to view its Kanban board." />
      ) : loading ? (
        <LoadingSpinner />
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
            {COLUMNS.map(col => (
              <div key={col.id} className="flex-shrink-0 w-64">
                <div className={`rounded-xl ${col.color} h-full`}>
                  <div className={`px-3 py-2.5 border-b-2 ${columnHeaderColors[col.id]} flex items-center justify-between`}>
                    <span className="text-sm font-semibold">{col.label}</span>
                    <span className="text-xs font-mono bg-white/70 px-1.5 py-0.5 rounded-full">
                      {columns[col.id].length}
                    </span>
                  </div>
                  <Droppable droppableId={col.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`p-2 min-h-[200px] transition-colors rounded-b-xl
                          ${snapshot.isDraggingOver ? 'bg-blue-50/50' : ''}
                        `}
                      >
                        {columns[col.id].map((ticket, index) => (
                          <TicketCard key={ticket.id} ticket={ticket} index={index} />
                        ))}
                        {provided.placeholder}
                        {columns[col.id].length === 0 && !snapshot.isDraggingOver && (
                          <div className="text-center py-8 text-xs text-slate-400">
                            Drop tickets here
                          </div>
                        )}
                      </div>
                    )}
                  </Droppable>
                </div>
              </div>
            ))}
          </div>
        </DragDropContext>
      )}
    </div>
  );
};
