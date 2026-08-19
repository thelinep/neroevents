import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchModels, createModel, deleteModel, testModel } from '../store/slices/modelsSlice';
import { fetchAgents } from '../store/slices/agentsSlice';
import { RootState, AppDispatch } from '../store';
import { Plus, Trash2, Play } from 'lucide-react';

export default function ModelStudio() {
  const dispatch = useDispatch<AppDispatch>();
  const { items } = useSelector((state: RootState) => state.models);
  const { items: agents } = useSelector((state: RootState) => state.agents);
  const [showForm, setShowForm] = useState(false);
  const [testResult, setTestResult] = useState('');

  useEffect(() => {
    dispatch(fetchModels());
    dispatch(fetchAgents());
  }, [dispatch]);

  const handleTest = async (config: any) => {
    const result = await dispatch(testModel(config));
    setTestResult(result.payload?.result || 'Test completed');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <h2 className="text-2xl font-bold">🧠 Model Studio</h2>
        <button onClick={() => setShowForm(true)} className="bg-blue-500 px-4 py-2 rounded flex items-center gap-2">
          <Plus size={18} /> New Custom Model
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((model: any) => (
          <div key={model.id} className="bg-[#1e293b] p-4 rounded">
            <h3 className="font-semibold">{model.name}</h3>
            <p className="text-sm text-gray-400">{model.description}</p>
            <p className="text-xs text-gray-500">Type: {model.type} | Strategy: {model.config?.strategy}</p>
            <div className="mt-2 flex gap-2">
              <button onClick={() => handleTest(model.config)} className="text-green-400"><Play size={16} /> Test</button>
              <button onClick={() => dispatch(deleteModel(model.id))} className="text-red-400"><Trash2 size={16} /></button>
            </div>
          </div>
        ))}
      </div>
      {testResult && (
        <div className="bg-[#0a0e1a] p-4 border border-[#1e293b] rounded">
          <h4 className="font-semibold">Test Output</h4>
          <p className="text-sm text-gray-300">{testResult}</p>
        </div>
      )}
      {showForm && (
        <ModelForm onCancel={() => setShowForm(false)} available={agents} />
      )}
    </div>
  );
}

function ModelForm({ onCancel, available }: any) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [strategy, setStrategy] = useState('majority_vote');
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const dispatch = useDispatch<AppDispatch>();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(createModel({ name, description, type: 'ensemble', config: { models: selectedModels, strategy } }));
    onCancel();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-[#0f172a] p-6 rounded max-w-xl w-full">
        <h3 className="text-xl font-bold mb-4">New Composite Model</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input className="w-full bg-[#1e293b] border border-[#334155] rounded p-2" placeholder="Name" value={name} onChange={e => setName(e.target.value)} required />
          <input className="w-full bg-[#1e293b] border border-[#334155] rounded p-2" placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} />
          <select className="w-full bg-[#1e293b] border border-[#334155] rounded p-2" value={strategy} onChange={e => setStrategy(e.target.value)}>
            <option value="majority_vote">Majority Vote</option>
            <option value="chain">Chain</option>
            <option value="router">Router</option>
          </select>
          <div className="flex flex-wrap gap-2">
            {available.map((m: any) => (
              <label key={m.id} className="flex items-center gap-1 bg-[#1e293b] px-2 py-1 rounded">
                <input type="checkbox" checked={selectedModels.includes(m.id)} onChange={e => {
                  if (e.target.checked) setSelectedModels([...selectedModels, m.id]);
                  else setSelectedModels(selectedModels.filter(id => id !== m.id));
                }} />
                {m.name}
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onCancel} className="bg-gray-600 px-4 py-2 rounded">Cancel</button>
            <button type="submit" className="bg-blue-500 px-4 py-2 rounded">Save Model</button>
          </div>
        </form>
      </div>
    </div>
  );
}