import  { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchFineTuneJobs, startFineTune, fetchDatasets } from '../store/slices/fineTuneSlice';
import { RootState, AppDispatch } from '../store';

export default function FineTune() {
  const dispatch = useDispatch<AppDispatch>();
  const { jobs, datasets } = useSelector((state: RootState) => state.fineTune);
  const [baseModel, setBaseModel] = useState('gemini-1.5-flash');
  const [dataset, setDataset] = useState('');
  const [jobName, setJobName] = useState('');

  useEffect(() => {
    dispatch(fetchFineTuneJobs());
    dispatch(fetchDatasets());
  }, [dispatch]);

  const handleStart = () => {
    if (!dataset) return alert('Select a dataset');
    dispatch(startFineTune({ baseModel, datasetId: dataset, name: jobName }));
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">🔬 Fine‑Tune Models</h2>
      <div className="bg-[#1e293b] p-4 rounded mb-4">
        <h3 className="font-semibold">Start New Fine‑Tuning Job</h3>
        <div className="flex flex-wrap gap-4 mt-2">
          <input className="bg-[#0f172a] border border-[#334155] rounded p-2 flex-1" placeholder="Job Name" value={jobName} onChange={e => setJobName(e.target.value)} />
          <select className="bg-[#0f172a] border border-[#334155] rounded p-2" value={baseModel} onChange={e => setBaseModel(e.target.value)}>
            <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
            <option value="llama3.2">Llama 3.2</option>
            <option value="gpt-4o-mini">GPT-4o Mini</option>
          </select>
          <select className="bg-[#0f172a] border border-[#334155] rounded p-2" value={dataset} onChange={e => setDataset(e.target.value)}>
            <option value="">Select dataset</option>
            {datasets.map((ds: any) => <option key={ds.id} value={ds.id}>{ds.name}</option>)}
          </select>
          <button onClick={handleStart} className="bg-blue-500 px-4 py-2 rounded">Start Job</button>
        </div>
      </div>
      <div className="space-y-2">
        {jobs.map((job: any) => (
          <div key={job.id} className="bg-[#1e293b] p-3 rounded flex justify-between">
            <div>
              <span className="font-semibold">{job.name || job.id}</span>
              <span className="ml-2 text-sm text-gray-400">{job.base_model}</span>
              <span className={`ml-2 px-2 py-0.5 text-xs rounded ${job.status === 'completed' ? 'bg-green-500/20 text-green-400' : job.status === 'running' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-gray-500/20 text-gray-400'}`}>{job.status}</span>
            </div>
            <span className="text-sm text-gray-500">{new Date(job.created_at).toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}