import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAgents } from '../store/slices/agentsSlice';
import { RootState, AppDispatch } from '../store';
import { addMessage, clearMessages, setIsRunning } from '../store/slices/playgroundSlice';

export default function Playground() {
  const dispatch = useDispatch<AppDispatch>();
  const { items: agents } = useSelector((state: RootState) => state.agents);
  const { messages, isRunning } = useSelector((state: RootState) => state.playground);
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [userPrompt, setUserPrompt] = useState('');
  const [mode, setMode] = useState<'round-robin' | 'directed'>('round-robin');
  const [maxTurns, setMaxTurns] = useState(5);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    dispatch(fetchAgents());
  }, [dispatch]);

  const startConversation = () => {
    if (selectedAgents.length < 2) {
      alert('Select at least two agents.');
      return;
    }
    dispatch(clearMessages());
    dispatch(setIsRunning(true));

    const url = `/api/playground/converse?agentIds=${selectedAgents.join(',')}&userPrompt=${encodeURIComponent(userPrompt)}&mode=${mode}&maxTurns=${maxTurns}`;
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'agent_turn') {
        dispatch(addMessage({ role: data.agent, content: data.content }));
      } else if (data.type === 'summary') {
        dispatch(addMessage({ role: 'Summary', content: data.content, isSummary: true }));
        dispatch(setIsRunning(false));
        eventSource.close();
      }
    };
    eventSource.onerror = () => {
      dispatch(setIsRunning(false));
      eventSource.close();
    };
  };

  const stopConversation = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      dispatch(setIsRunning(false));
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-4 mb-4">
        <h2 className="text-2xl font-bold">Agent Playground</h2>
        <div className="flex gap-2">
          {agents.map((a: any) => (
            <label key={a.id} className="flex items-center gap-1 bg-[#1e293b] px-2 py-1 rounded">
              <input type="checkbox" checked={selectedAgents.includes(a.id)} onChange={e => {
                if (e.target.checked) setSelectedAgents([...selectedAgents, a.id]);
                else setSelectedAgents(selectedAgents.filter(id => id !== a.id));
              }} />
              {a.name}
            </label>
          ))}
        </div>
        <select className="bg-[#1e293b] border border-[#334155] rounded p-1" value={mode} onChange={e => setMode(e.target.value as any)}>
          <option value="round-robin">Round Robin</option>
          <option value="directed">Directed</option>
        </select>
        <input type="number" className="w-16 bg-[#1e293b] border border-[#334155] rounded p-1" value={maxTurns} onChange={e => setMaxTurns(parseInt(e.target.value) || 5)} />
      </div>
      <div className="flex gap-2 mb-2">
        <input className="flex-1 bg-[#1e293b] border border-[#334155] rounded p-2" placeholder="Your prompt..." value={userPrompt} onChange={e => setUserPrompt(e.target.value)} />
        <button onClick={startConversation} disabled={isRunning} className="bg-blue-500 px-4 py-2 rounded disabled:opacity-50">Start</button>
        <button onClick={stopConversation} disabled={!isRunning} className="bg-red-500 px-4 py-2 rounded disabled:opacity-50">Stop</button>
      </div>
      <div className="flex-1 overflow-auto bg-[#0a0e1a] p-4 rounded border border-[#1e293b] space-y-2">
        {messages.map((msg: any, idx: number) => (
          <div key={idx} className={`p-2 rounded ${msg.isSummary ? 'bg-[#2a3a4a] border border-yellow-500/30' : 'bg-[#1e293b]'}`}>
            <span className="font-bold text-blue-400">{msg.role}:</span> {msg.content}
          </div>
        ))}
      </div>
    </div>
  );
}