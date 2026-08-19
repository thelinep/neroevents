import  { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchGlobalHistory } from '../store/slices/historySlice';
import { RootState, AppDispatch } from '../store';

export default function HistoryView() {
  const dispatch = useDispatch<AppDispatch>();
  const { items, isLoading } = useSelector((state: RootState) => state.history);

  useEffect(() => {
    dispatch(fetchGlobalHistory());
  }, [dispatch]);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Activity History</h2>
      {isLoading && <p className="text-gray-400">Loading...</p>}
      <div className="space-y-2">
        {items.map((h: any) => (
          <div key={h.id} className="bg-[#1e293b] p-3 rounded flex justify-between">
            <div>
              <span className="font-semibold">{h.action}</span>
              <span className="text-sm text-gray-400 ml-2">{h.details?.projectName || ''}</span>
            </div>
            <span className="text-xs text-gray-500">{new Date(h.created_at).toLocaleString()}</span>
          </div>
        ))}
        {items.length === 0 && !isLoading && <p className="text-gray-400">No history entries yet.</p>}
      </div>
    </div>
  );
}