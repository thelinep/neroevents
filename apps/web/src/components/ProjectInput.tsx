import React, { useState, useRef } from 'react';
// import { useDispatch, useSelector } from 'react-redux';
// import { createProject } from '../store/slices/projectsSlice';
// import { AppDispatch, RootState } from '../store';
import api from '../api';

interface ProjectInputProps {
  onTasksGenerated?: (tasks: any[]) => void;
}

export default function ProjectInput({ onTasksGenerated }: ProjectInputProps) {
//   const dispatch = useDispatch<AppDispatch>();
//   const { project } = useSelector((state: RootState) => state.currentProject);
  const [method, setMethod] = useState<'describe' | 'zip' | 'folder' | 'github'>('describe');
  const [description, setDescription] = useState('');
  const [folderPath, setFolderPath] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (method === 'describe' && !description.trim()) {
      setError('Please enter a description.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      let endpoint = '/api/project/generate';
      let body: any = { description, provider: 'ollama' };

      if (method === 'folder') {
        body.folderPath = folderPath;
      } else if (method === 'github') {
        body.githubUrl = githubUrl;
      } else if (method === 'zip') {
        const fd = new FormData();
        fd.append('file', fileInput.current!.files![0]);
        fd.append('description', description);
        const res = await api.post('/api/project/upload-zip', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        const data = res.data;
        if (onTasksGenerated) onTasksGenerated(data.tasks);
        setLoading(false);
        return;
      }

      const res = await api.post(endpoint, body);
      const data = res.data;
      if (onTasksGenerated) onTasksGenerated(data.tasks);
    } catch (err: any) {
      setError(err.message || 'Failed to generate roadmap.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#0f172a] border border-[#1e293b] rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-3">Generate Roadmap</h3>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex gap-4">
          {['describe', 'zip', 'folder', 'github'].map((m) => (
            <label key={m} className="flex items-center gap-1">
              <input type="radio" value={m} checked={method === m} onChange={() => setMethod(m as any)} />
              <span className="capitalize text-sm">{m}</span>
            </label>
          ))}
        </div>

        {method === 'describe' && (
          <textarea className="w-full bg-[#1e293b] border border-[#334155] rounded p-2" rows={4} placeholder="Describe your project..." value={description} onChange={e => setDescription(e.target.value)} />
        )}
        {method === 'zip' && <input type="file" accept=".zip" ref={fileInput} className="w-full" />}
        {method === 'folder' && <input className="w-full bg-[#1e293b] border border-[#334155] rounded p-2" placeholder="/path/to/folder" value={folderPath} onChange={e => setFolderPath(e.target.value)} />}
        {method === 'github' && <input className="w-full bg-[#1e293b] border border-[#334155] rounded p-2" placeholder="https://github.com/user/repo.git" value={githubUrl} onChange={e => setGithubUrl(e.target.value)} />}

        {error && <div className="text-red-400 text-sm">{error}</div>}
        <button type="submit" disabled={loading} className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50 transition">
          {loading ? 'Generating...' : 'Generate Roadmap'}
        </button>
      </form>
    </div>
  );
}