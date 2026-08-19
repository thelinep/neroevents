import  { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProjectDetail } from '../store/slices/currentProjectSlice';
import { RootState, AppDispatch } from '../store';
import TaskBoard from '../components/TaskBoard';
import ContextPanel from '../components/ContextPanel';
import FileExplorer from '../components/FileExplorer';
import AgentChat from '../components/AgentChat';

export default function ProjectView() {
  const { id } = useParams<{ id: string }>();
  const dispatch = useDispatch<AppDispatch>();
  const { project, tasks, history, isLoading } = useSelector((state: RootState) => state.currentProject);

  useEffect(() => {
    if (id) dispatch(fetchProjectDetail(id));
  }, [id, dispatch]);

  if (isLoading) return <div className="text-white p-6">Loading project...</div>;
  if (!project) return <div className="text-white p-6">Project not found.</div>;

  return (
    <div className="grid grid-cols-4 gap-4 h-full">
      <div className="col-span-3 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">{project.name}</h2>
          <span className="text-sm text-gray-400">ID: {id}</span>
        </div>
        <TaskBoard tasks={tasks} />
        <AgentChat projectId={id} />
      </div>
      <div className="col-span-1 space-y-4">
        {id && <ContextPanel projectId={id} context={project.context || {}} />}
        {id && <FileExplorer projectId={id} />}
        <div className="bg-[#1e293b] p-3 rounded">
          <h4 className="font-semibold">Recent History</h4>
          <ul className="text-xs text-gray-400 max-h-40 overflow-auto">
            {history.slice(0, 5).map((h: any) => (
              <li key={h.id}>{h.action} — {new Date(h.created_at).toLocaleTimeString()}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}