// import React from 'react';
import ReactDiffViewer from 'react-diff-viewer-continued';

interface ApprovalModalProps {
  isOpen: boolean;
  task: any;
  onApprove: () => void;
  onReject: () => void;
}

export default function ApprovalModal({ isOpen, task, onApprove, onReject }: ApprovalModalProps) {
  if (!isOpen || !task || !task.result?.diff) return null;

  const diff = task.result.diff;
  const oldText = Object.entries(diff).map(([file, content]) => `--- ${file}\n${content}`).join('\n');
  const newText = Object.entries(diff).map(([file, content]) => `+++ ${file}\n${content}`).join('\n');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-[#0f172a] border border-[#1e293b] rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-auto">
        <h3 className="text-xl font-bold mb-4">Approve Changes for {task.name}</h3>
        <div className="border border-[#334155] rounded p-2 overflow-auto max-h-64">
          <ReactDiffViewer oldValue={oldText} newValue={newText} splitView={true} />
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onReject} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded transition">Reject</button>
          <button onClick={onApprove} className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded transition">Approve & Apply</button>
        </div>
      </div>
    </div>
  );
}