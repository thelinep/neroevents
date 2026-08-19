import { useState } from 'react';
import  converse  from '../api';

interface AgentChatProps {
  projectId?: string; // optional if not always needed
}

export default function AgentChat({ projectId }: AgentChatProps) {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;
    setLoading(true);
    try {
      const res = await converse(input);
      setMessages(prev => [...prev, { role: 'user', content: input }, ...res.data.messages]);
      setInput('');
    } catch (err) {
      console.error('Conversation failed', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#0f172a] border border-[#1e293b] rounded-lg p-3 h-64 flex flex-col">
        {projectId && <div className="text-xs text-gray-400 mb-1">Project ID: {projectId}</div>}
      <div className="flex-1 overflow-auto space-y-1 text-sm">
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'text-right' : 'text-left'}>
            <span className="font-bold text-blue-400">{m.role}:</span> {m.content}
          </div>
        ))}
      </div>
      <div className="flex gap-2 mt-2">
        <input className="flex-1 bg-[#1e293b] border border-[#334155] rounded p-1 text-sm" placeholder="Message..." value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} />
        <button onClick={handleSend} disabled={loading} className="bg-blue-500 text-white px-3 py-1 rounded text-sm disabled:opacity-50">Send</button>
      </div>
    </div>
  );
}