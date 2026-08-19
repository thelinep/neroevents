// import React from 'react';
import {  useSelector } from 'react-redux';
import { RootState } from '../store';
// import { updateTask } from '../store/slices/currentProjectSlice';
import api from '../api';

interface Task {
  id: number;
  name: string;
  prompt: string;
  agent: string;
  type: string;
  status: string;
  files?: string[];
  result?: any;
  error?: string;
}

interface TaskBoardProps {
  tasks: Task[];
}

export default function TaskBoard({ tasks }: TaskBoardProps) {
//   const dispatch = useDispatch<AppDispatch>();
  const { project } = useSelector((state: RootState) => state.currentProject);

  const handleRun = async (taskId: number) => {
    if (!project) return;
    try {
        const res = await api.post(`/projects/${project.id}/tasks/${taskId}/run`);
        console.log('Run task response:', res.data);
    //   const res = await api.post(`/tasks/${taskId}/run`);
      // The orchestrator will broadcast updates via WebSocket
      // but we can also optimistically update
    } catch (error) {
      console.error('Failed to run task', error);
    }
  };

  const handleApprove = async (taskId: number) => {
    try {
      await api.post(`/tasks/${taskId}/approve`);
      // Refresh tasks (or wait for WebSocket)
    } catch (error) {
      console.error('Failed to approve task', error);
    }
  };

  const handleReject = async (taskId: number) => {
    try {
      await api.post(`/tasks/${taskId}/reject`);
    } catch (error) {
      console.error('Failed to reject task', error);
    }
  };

  return (
    <div className="space-y-2">
      {tasks.map((task) => (
        <div key={task.id} className="bg-[#1e293b] p-4 rounded-lg border border-[#334155]">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="font-semibold">{task.name}</h4>
              <p className="text-sm text-gray-400">{task.prompt}</p>
              <div className="flex gap-2 mt-1 text-xs">
                <span className="bg-[#0f172a] px-2 py-0.5 rounded">Agent: {task.agent}</span>
                <span className={`px-2 py-0.5 rounded ${task.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' : task.status === 'running' ? 'bg-blue-500/20 text-blue-400' : task.status === 'awaiting_approval' ? 'bg-purple-500/20 text-purple-400' : task.status === 'applied' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{task.status}</span>
              </div>
            </div>
            <div className="flex gap-2">
              {task.status === 'pending' && (
                <button onClick={() => handleRun(task.id)} className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm transition">Run</button>
              )}
              {task.status === 'awaiting_approval' && (
                <>
                  <button onClick={() => handleApprove(task.id)} className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm transition">Approve</button>
                  <button onClick={() => handleReject(task.id)} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm transition">Reject</button>
                </>
              )}
            </div>
          </div>
          {task.result?.diff && (
            <details className="mt-2">
              <summary className="text-sm text-blue-400 cursor-pointer">View Diff</summary>
              <pre className="bg-[#0f172a] p-2 rounded text-xs overflow-auto max-h-40">{JSON.stringify(task.result.diff, null, 2)}</pre>
            </details>
          )}
          {task.error && <div className="text-red-400 text-sm mt-2">Error: {task.error}</div>}
        </div>
      ))}
      {tasks.length === 0 && <p className="text-gray-400">No tasks yet. Generate a roadmap first.</p>}
    </div>
  );
}