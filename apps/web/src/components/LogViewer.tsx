import  { useRef, useEffect } from 'react';

interface LogViewerProps {
  logs: string[];
}

export default function LogViewer({ logs }: LogViewerProps) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [logs]);

  return (
    <div className="bg-[#080c16] p-3 rounded border border-[#1e293b] h-48 overflow-y-auto font-mono text-xs" ref={ref}>
      {logs.map((log, i) => (
        <div key={i} className="text-gray-300 border-b border-[#1e293b]/30 py-1">
          <span className="text-gray-500">[{new Date().toLocaleTimeString()}]</span> {log}
        </div>
      ))}
    </div>
  );
}