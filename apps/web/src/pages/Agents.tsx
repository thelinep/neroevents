import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAgents, createAgent, updateAgent, deleteAgent, shareAgent } from '../store/slices/agentsSlice';
import { RootState, AppDispatch } from '../store';
import { Plus, Edit, Trash2, Share2 } from 'lucide-react';

export default function Agents() {
  const dispatch = useDispatch<AppDispatch>();
  const { items, isLoading } = useSelector((state: RootState) => state.agents);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  useEffect(() => {
    dispatch(fetchAgents());
  }, [dispatch]);

  const handleSave = async (data: any) => {
    if (editing) {
      await dispatch(updateAgent({ id: editing.id, data }));
    } else {
      await dispatch(createAgent(data));
    }
    setShowForm(false);
    setEditing(null);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Custom Agents</h2>
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="bg-blue-500 px-4 py-2 rounded flex items-center gap-2">
          <Plus size={18} /> Create Agent
        </button>
      </div>
      {isLoading && <p>Loading...</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((agent: any) => (
          <div key={agent.id} className="bg-[#1e293b] p-4 rounded-lg relative group">
            <h3 className="font-semibold">{agent.name}</h3>
            <p className="text-sm text-gray-400">{agent.description || 'No description'}</p>
            <p className="text-xs text-gray-500 mt-1">Model: {agent.model_provider}/{agent.model_name}</p>
            <div className="mt-2 flex gap-2">
              <button onClick={() => { setEditing(agent); setShowForm(true); }} className="text-blue-400 hover:text-blue-300"><Edit size={16} /></button>
              <button onClick={() => dispatch(deleteAgent(agent.id))} className="text-red-400 hover:text-red-300"><Trash2 size={16} /></button>
              <button onClick={() => dispatch(shareAgent(agent.id))} className="text-green-400 hover:text-green-300"><Share2 size={16} /></button>
              {agent.shareToken && <span className="text-xs text-gray-400 ml-2 truncate max-w-[100px]">🔗 {agent.shareToken}</span>}
            </div>
          </div>
        ))}
      </div>
      {showForm && (
        <AgentForm
          initial={editing}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditing(null); }}
        />
      )}
    </div>
  );
}

// Simple Agent Form (inline modal)
function AgentForm({ initial, onSave, onCancel }: any) {
  const [name, setName] = useState(initial?.name || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [systemPrompt, setSystemPrompt] = useState(initial?.system_prompt || '');
  const [modelProvider, setModelProvider] = useState(initial?.model_provider || 'ollama');
  const [modelName, setModelName] = useState(initial?.model_name || 'llama3.2');
  const [temperature, setTemperature] = useState(initial?.temperature || 0.7);
  const [tools, setTools] = useState(initial?.tools?.join(', ') || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name,
      description,
      system_prompt: systemPrompt,
      model_provider: modelProvider,
      model_name: modelName,
      temperature: parseFloat(temperature),
      tools: tools.split(',').map((s:string) => s.trim()).filter(Boolean),
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-[#0f172a] p-6 rounded-lg w-full max-w-2xl">
        <h3 className="text-xl font-bold mb-4">{initial ? 'Edit Agent' : 'New Agent'}</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input className="w-full bg-[#1e293b] border border-[#334155] rounded p-2" placeholder="Name" value={name} onChange={e => setName(e.target.value)} required />
          <input className="w-full bg-[#1e293b] border border-[#334155] rounded p-2" placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} />
          <textarea className="w-full bg-[#1e293b] border border-[#334155] rounded p-2" rows={3} placeholder="System prompt" value={systemPrompt} onChange={e => setSystemPrompt(e.target.value)} />
          <div className="flex gap-2">
            <select className="bg-[#1e293b] border border-[#334155] rounded p-2 flex-1" value={modelProvider} onChange={e => setModelProvider(e.target.value)}>
              <option value="ollama">Ollama</option>
              <option value="gemini">Gemini</option>
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
            </select>
            <input className="bg-[#1e293b] border border-[#334155] rounded p-2 flex-1" placeholder="Model name" value={modelName} onChange={e => setModelName(e.target.value)} />
          </div>
          <input className="w-full bg-[#1e293b] border border-[#334155] rounded p-2" type="number" step="0.1" placeholder="Temperature" value={temperature} onChange={e => setTemperature(e.target.value)} />
          <input className="w-full bg-[#1e293b] border border-[#334155] rounded p-2" placeholder="Tools (comma separated: file_read, web_search)" value={tools} onChange={e => setTools(e.target.value)} />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onCancel} className="bg-gray-600 px-4 py-2 rounded">Cancel</button>
            <button type="submit" className="bg-blue-500 px-4 py-2 rounded">Save</button>
          </div>
        </form>
      </div>
    </div>
  );
}