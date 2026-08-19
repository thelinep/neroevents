import  { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchPerformance, fetchGraph, processGoal } from '../store/slices/quantumSlice';
import { RootState, AppDispatch } from '../store';
import KnowledgeGraphVis from '../components/KnowledgeGraphVis';

export default function QuantumDashboard() {
  const dispatch = useDispatch<AppDispatch>();
  const { performance, graph } = useSelector((state: RootState) => state.quantum);
  const [prompt, setPrompt] = useState('');
  const [autonomy, setAutonomy] = useState('medium');

  useEffect(() => {
    dispatch(fetchPerformance());
    dispatch(fetchGraph());
  }, [dispatch]);

  const handleProcess = () => {
    if (prompt) dispatch(processGoal({ prompt, autonomy }));
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">🧠 Quantum Dashboard</h2>
      <div className="bg-[#1e293b] p-4 rounded">
        <h3 className="font-semibold">Process New Goal</h3>
        <div className="flex flex-wrap gap-2 mt-2">
          <input className="flex-1 bg-[#0f172a] border border-[#334155] rounded p-2" placeholder="Enter your goal..." value={prompt} onChange={e => setPrompt(e.target.value)} />
          <select className="bg-[#0f172a] border border-[#334155] rounded p-2" value={autonomy} onChange={e => setAutonomy(e.target.value)}>
            <option value="min">🛑 Min – Ask before every task</option>
            <option value="average">⚖️ Average – Ask for high‑impact actions</option>
            <option value="high">🚀 High – Ask only for deployment</option>
            <option value="full">🧠 Full – No approvals</option>
          </select>
          <button onClick={handleProcess} className="bg-blue-500 px-4 py-2 rounded">Run</button>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-[#1e293b] p-4 rounded col-span-2">
          <h4 className="font-semibold mb-2">Knowledge Graph</h4>
          <div className="h-64 overflow-auto">
            <KnowledgeGraphVis nodes={graph.nodes} edges={graph.edges} />
          </div>
        </div>
        <div className="bg-[#1e293b] p-4 rounded">
          <h4 className="font-semibold mb-2">Model Performance</h4>
          <div className="space-y-2 text-sm">
            {performance.map((p: any) => (
              <div key={`${p.model_name}-${p.task_type}`} className="flex justify-between border-b border-[#334155] py-1">
                <span>{p.model_name} ({p.task_type})</span>
                <span className="text-gray-400">success: {p.success_count}/{p.total_count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}