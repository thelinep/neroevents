import  { useState, useEffect } from 'react';
import api from '../api';

interface FileItem {
  name: string;
  isDirectory: boolean;
  size: number;
  modified: string;
}

interface FileExplorerProps {
  projectId: string;
}

export default function FileExplorer({ projectId }: FileExplorerProps) {
  const [currentPath, setCurrentPath] = useState('');
  const [items, setItems] = useState<FileItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [loading, setLoading] = useState(true);

  const loadDir = async (dir: string = '') => {
    setLoading(true);
    try {
      const res = await api.get('/files/list', { params: { dir } });
      setItems(res.data.items);
      setCurrentPath(res.data.currentPath);
    } catch (err) {
      console.error('Failed to load directory', err);
    } finally {
      setLoading(false);
    }
  };

  const loadFile = async (file: string) => {
    try {
      const res = await api.get('/files/file', { params: { file } });
      setFileContent(res.data.content);
      setSelectedFile(file);
    } catch (err) {
      console.error('Failed to load file', err);
    }
  };

  const enterDir = (name: string) => {
    const newPath = currentPath ? `${currentPath}/${name}` : name;
    loadDir(newPath);
  };

  useEffect(() => {
    loadDir();
  }, [projectId]);

  return (
    <div className="bg-[#0f172a] border border-[#1e293b] rounded-lg p-3 h-64 overflow-auto">
      <div className="text-sm text-gray-400 mb-2">📁 {currentPath || '/'}</div>
      {loading && <p className="text-gray-500 text-sm">Loading...</p>}
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.name} className="flex justify-between items-center hover:bg-[#1e293b] px-2 py-0.5 rounded cursor-pointer">
            {item.isDirectory ? (
              <span onClick={() => enterDir(item.name)} className="text-blue-400">📂 {item.name}</span>
            ) : (
              <span onClick={() => loadFile(currentPath ? `${currentPath}/${item.name}` : item.name)} className="text-gray-300">📄 {item.name}</span>
            )}
            <span className="text-xs text-gray-500">{(item.size / 1024).toFixed(1)} KB</span>
          </li>
        ))}
      </ul>
      {selectedFile && (
        <div className="mt-3 border-t border-[#1e293b] pt-2">
          <div className="text-xs font-semibold text-gray-400">{selectedFile}</div>
          <pre className="bg-[#080c16] p-2 rounded text-xs overflow-auto max-h-40">{fileContent}</pre>
        </div>
      )}
    </div>
  );
}