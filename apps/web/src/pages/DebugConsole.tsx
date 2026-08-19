import  { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTraces, pause, resume, stepOver, stepInto, setBreakpoint, removeBreakpoint } from '../store/slices/debugSlice';
import { RootState, AppDispatch } from '../store';
import { Play, Pause, StepForward, CornerDownRight } from 'lucide-react';

export default function DebugConsole() {
  const dispatch = useDispatch<AppDispatch>();
  const { traces, breakpoints } = useSelector((state: RootState) => state.debug);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [target, setTarget] = useState('');

  useEffect(() => {
    dispatch(fetchTraces(sessionId));
  }, [dispatch, sessionId]);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">🐞 Debug Console</h2>
      <div className="flex gap-2">
        <button onClick={() => dispatch(pause())} className="bg-yellow-500 px-3 py-1 rounded flex items-center gap-1"><Pause size={16} /> Pause</button>
        <button onClick={() => dispatch(resume())} className="bg-green-500 px-3 py-1 rounded flex items-center gap-1"><Play size={16} /> Resume</button>
        <button onClick={() => dispatch(stepOver())} className="bg-blue-500 px-3 py-1 rounded flex items-center gap-1"><StepForward size={16} /> Step Over</button>
        <button onClick={() => dispatch(stepInto())} className="bg-purple-500 px-3 py-1 rounded flex items-center gap-1"><CornerDownRight size={16} /> Step Into</button>
      </div>
      <div className="bg-[#1e293b] p-4 rounded">
        <h4 className="font-semibold">Breakpoints</h4>
        <div className="flex gap-2 mt-1">
          <input className="bg-[#0f172a] border border-[#334155] rounded p-1 text-sm" placeholder="task:123" value={target} onChange={e => setTarget(e.target.value)} />
          <button onClick={() => { if (target) { dispatch(setBreakpoint({ target })); setTarget(''); } }}>Add</button>
        </div>
        <ul className="text-sm mt-2">
          {breakpoints.map((bp: string) => (
            <li key={bp} className="flex justify-between">
              <span>{bp}</span>
              <button onClick={() => dispatch(removeBreakpoint(bp))} className="text-red-400">✕</button>
            </li>
          ))}
        </ul>
      </div>
      <div className="bg-[#0f172a] p-4 rounded h-64 overflow-y-auto font-mono text-xs space-y-1">
        {traces.map((t: any) => (
          <div key={t.id} className="border-b border-[#1e293b] py-1">
            <span className="text-blue-400">{t.node_type}</span> – <span className="text-gray-300">{t.metadata?.phase}</span>
          </div>
        ))}
      </div>
    </div>
  );
}