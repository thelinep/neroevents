// import React from 'react';

interface StatusIndicatorProps {
  status: 'online' | 'offline' | 'busy' | 'idle';
  label?: string;
}

export default function StatusIndicator({ status, label }: StatusIndicatorProps) {
  const colors = {
    online: 'bg-green-500',
    offline: 'bg-gray-500',
    busy: 'bg-red-500',
    idle: 'bg-yellow-500',
  };
  return (
    <div className="flex items-center gap-2">
      <span className={`w-2 h-2 rounded-full ${colors[status]}`}></span>
      <span className="text-sm">{label || status}</span>
    </div>
  );
}