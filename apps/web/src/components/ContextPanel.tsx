import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { updateContext } from '../store/slices/currentProjectSlice';
import { AppDispatch } from '../store';

interface ContextPanelProps {
  projectId: string;
  context: Record<string, any>;
}

export default function ContextPanel({ projectId, context }: ContextPanelProps) {
  const dispatch = useDispatch<AppDispatch>();
  const [editKey, setEditKey] = useState('');
  const [editValue, setEditValue] = useState('');
//   const [editingKey, setEditingKey] = useState<string | null>(null);

  const addOrUpdate = () => {
    if (!editKey.trim()) return;
    dispatch(updateContext({ [editKey]: editValue }));
    setEditKey('');
    setEditValue('');
  };

  return (
    <div className="bg-[#0f172a] border border-[#1e293b] rounded-lg p-3">
      <h4 className="font-semibold text-sm mb-2">🧠 Context {projectId ?? 'Unknown'}</h4>
      <div className="space-y-1 text-sm max-h-40 overflow-auto">
        {Object.entries(context).map(([key, value]) => (
          <div key={key} className="flex justify-between items-center border-b border-[#1e293b] py-1">
            <span className="text-blue-400">{key}:</span>
            <span className="text-gray-300">{typeof value === 'string' ? value : JSON.stringify(value)}</span>
          </div>
        ))}
        {Object.keys(context).length === 0 && <span className="text-gray-500 text-xs">No context stored.</span>}
      </div>
      <div className="mt-2 flex gap-2">
        <input className="flex-1 bg-[#1e293b] border border-[#334155] rounded p-1 text-xs" placeholder="Key" value={editKey} onChange={e => setEditKey(e.target.value)} />
        <input className="flex-1 bg-[#1e293b] border border-[#334155] rounded p-1 text-xs" placeholder="Value" value={editValue} onChange={e => setEditValue(e.target.value)} />
        <button onClick={addOrUpdate} className="bg-blue-500 text-white px-2 py-1 rounded text-xs">Add</button>
      </div>
    </div>
  );
}