import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { fetchProjects, createProject } from '../store/slices/projectsSlice';
import { RootState, AppDispatch } from '../store';
import { Plus, FolderOpen, Activity, Users, Zap } from 'lucide-react';

export default function Dashboard() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { items: projects, isLoading } = useSelector((state: RootState) => state.projects);
  const { user } = useSelector((state: RootState) => state.auth);
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  useEffect(() => {
    dispatch(fetchProjects());
  }, [dispatch]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    const result = await dispatch(createProject({ name: newProjectName }));
    if (createProject.fulfilled.match(result)) {
      setNewProjectName('');
      setShowNewProject(false);
      navigate(`/project/${result.payload.id}`);
    }
  };

  const stats = {
    projects: projects.length,
    tasks: 0,
    agents: 0,
    active: 'Online',
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Dashboard</h2>
          <p className="text-gray-400">Welcome back, {user?.displayName || user?.email || 'Developer'}!</p>
        </div>
        <button
          onClick={() => setShowNewProject(true)}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
        >
          <Plus size={18} /> New Project
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#1e293b] p-4 rounded-lg border border-[#334155]">
          <div className="flex items-center gap-2 text-gray-400"><FolderOpen size={18} /> Projects</div>
          <div className="text-2xl font-bold">{stats.projects}</div>
        </div>
        <div className="bg-[#1e293b] p-4 rounded-lg border border-[#334155]">
          <div className="flex items-center gap-2 text-gray-400"><Activity size={18} /> Tasks</div>
          <div className="text-2xl font-bold">{stats.tasks}</div>
        </div>
        <div className="bg-[#1e293b] p-4 rounded-lg border border-[#334155]">
          <div className="flex items-center gap-2 text-gray-400"><Users size={18} /> Agents</div>
          <div className="text-2xl font-bold">{stats.agents}</div>
        </div>
        <div className="bg-[#1e293b] p-4 rounded-lg border border-[#334155]">
          <div className="flex items-center gap-2 text-gray-400"><Zap size={18} /> Status</div>
          <div className="text-2xl font-bold text-green-400">{stats.active}</div>
        </div>
      </div>

      <div className="bg-[#0f172a] border border-[#1e293b] rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-3">Recent Projects</h3>
        {isLoading ? (
          <p className="text-gray-400">Loading projects...</p>
        ) : projects.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <FolderOpen size={48} className="mx-auto mb-2 opacity-50" />
            <p>No projects yet.</p>
            <button onClick={() => setShowNewProject(true)} className="mt-2 text-blue-400 hover:underline">
              Create your first project
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {projects.map((project) => (
              <Link key={project.id} to={`/project/${project.id}`} className="block bg-[#1e293b] hover:bg-[#2a3a4a] transition rounded-lg p-3 border border-[#334155]">
                <div className="flex justify-between items-center">
                  <span className="font-medium">{project.name}</span>
                  <span className="text-sm text-gray-400">{new Date(project.updated_at).toLocaleDateString()}</span>
                </div>
                {project.description && <div className="text-sm text-gray-400 mt-1">{project.description}</div>}
              </Link>
            ))}
          </div>
        )}
      </div>

      {showNewProject && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-[#0f172a] border border-[#1e293b] rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Create New Project</h3>
            <form onSubmit={handleCreateProject}>
              <input
                type="text"
                className="w-full bg-[#1e293b] border border-[#334155] rounded p-2 mb-4"
                placeholder="Project name"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowNewProject(false)} className="px-4 py-2 rounded bg-gray-600 hover:bg-gray-700 transition">Cancel</button>
                <button type="submit" disabled={!newProjectName.trim()} className="px-4 py-2 rounded bg-blue-500 hover:bg-blue-600 transition disabled:opacity-50">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}