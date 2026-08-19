// import React from 'react';
import ReactDiffViewer from 'react-diff-viewer-continued';

interface DiffViewerProps {
  diff: Record<string, string>;
}

export default function DiffViewer({ diff }: DiffViewerProps) {
  if (!diff || Object.keys(diff).length === 0) {
    return <p className="text-gray-400">No diff available.</p>;
  }
  const oldText = Object.entries(diff).map(([file, content]) => `--- ${file}\n${content}`).join('\n');
  const newText = Object.entries(diff).map(([file, content]) => `+++ ${file}\n${content}`).join('\n');
  return <ReactDiffViewer oldValue={oldText} newValue={newText} splitView={true} />;
}