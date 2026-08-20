import  { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, FolderOpen, Activity, Users, Zap } from 'lucide-react';

import { Button, Dialog, Input } from '@nevo/ui';

import {
  fetchProjects,
  createProject,
} from '../store/slices/projectsSlice';

import type {
  RootState,
  AppDispatch,
} from '../store';

export default function Dashboard() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  const {
    items: projects,
    isLoading,
  } = useSelector(
    (state: RootState) => state.projects,
  );

  const { user } = useSelector(
    (state: RootState) => state.auth,
  );

  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  useEffect(() => {
    void dispatch(fetchProjects());
  }, [dispatch]);
const submitCreateProject = async () => {
  if (!newProjectName.trim()) return;

  const result = await dispatch(
    createProject({
      name: newProjectName.trim(),
    }),
  );

  if (createProject.fulfilled.match(result)) {
    setNewProjectName('');
    setShowNewProject(false);
    navigate(`/project/${result.payload.id}`);
  }
};

  const handleCloseNewProject = () => {
    setShowNewProject(false);
  };

  const stats = {
    projects: projects.length,
    tasks: 0,
    agents: 0,
    active: 'Online',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">
            Dashboard
          </h2>

          <p className="text-gray-400">
            Welcome back,{' '}
            {user?.displayName ||
              user?.email ||
              'Developer'}
            !
          </p>
        </div>

        <Button
          type="button"
          onClick={() => setShowNewProject(true)}
        >
          <Plus size={18} />
          New Project
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-[#334155] bg-[#1e293b] p-4">
          <div className="flex items-center gap-2 text-gray-400">
            <FolderOpen size={18} />
            Projects
          </div>

          <div className="text-2xl font-bold">
            {stats.projects}
          </div>
        </div>

        <div className="rounded-lg border border-[#334155] bg-[#1e293b] p-4">
          <div className="flex items-center gap-2 text-gray-400">
            <Activity size={18} />
            Tasks
          </div>

          <div className="text-2xl font-bold">
            {stats.tasks}
          </div>
        </div>

        <div className="rounded-lg border border-[#334155] bg-[#1e293b] p-4">
          <div className="flex items-center gap-2 text-gray-400">
            <Users size={18} />
            Agents
          </div>

          <div className="text-2xl font-bold">
            {stats.agents}
          </div>
        </div>

        <div className="rounded-lg border border-[#334155] bg-[#1e293b] p-4">
          <div className="flex items-center gap-2 text-gray-400">
            <Zap size={18} />
            Status
          </div>

          <div className="text-2xl font-bold text-green-400">
            {stats.active}
          </div>
        </div>
      </div>

      {/* Recent Projects */}
      <div className="rounded-lg border border-[#1e293b] bg-[#0f172a] p-4">
        <h3 className="mb-3 text-lg font-semibold">
          Recent Projects
        </h3>

        {isLoading ? (
          <p className="text-gray-400">
            Loading projects...
          </p>
        ) : projects.length === 0 ? (
          <div className="py-8 text-center text-gray-400">
            <FolderOpen
              size={48}
              className="mx-auto mb-2 opacity-50"
            />

            <p>No projects yet.</p>

            <button
              type="button"
              onClick={() => setShowNewProject(true)}
              className="mt-2 text-blue-400 hover:underline"
            >
              Create your first project
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {projects.map((project) => (
              <Link
                key={project.id}
                to={`/project/${project.id}`}
                className="block rounded-lg border border-[#334155] bg-[#1e293b] p-3 transition hover:bg-[#2a3a4a]"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {project.name}
                  </span>

                  <span className="text-sm text-gray-400">
                    {new Date(
                      project.updated_at,
                    ).toLocaleDateString()}
                  </span>
                </div>

                {project.description && (
                  <div className="mt-1 text-sm text-gray-400">
                    {project.description}
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Create Project Dialog */}
      <Dialog
        open={showNewProject}
        onOpenChange={setShowNewProject}
        title="Create New Project"
      >
        <form
  onSubmit={(event) => {
    event.preventDefault();
    void submitCreateProject();
  }}
>
          <Input
            type="text"
            placeholder="Project name"
            value={newProjectName}
            onChange={(event) =>
              setNewProjectName(event.target.value)
            }
            autoFocus
          />

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              onClick={handleCloseNewProject}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={!newProjectName.trim()}
            >
              Create
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}