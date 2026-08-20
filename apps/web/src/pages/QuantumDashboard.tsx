import {
  useEffect,
  useState,
} from 'react';

import {
  useDispatch,
  useSelector,
} from 'react-redux';

import {
  Button,
  Input,
} from '@nevo/ui';

import {
  fetchPerformance,
  fetchGraph,
  processGoal,
} from '../store/slices/quantumSlice';

import type {
  RootState,
  AppDispatch,
} from '../store';

import KnowledgeGraphVis from '../components/KnowledgeGraphVis';

type Autonomy =
  | 'min'
  | 'average'
  | 'high'
  | 'full';

interface PerformanceItem {
  model_name: string;
  task_type: string;
  success_count: number;
  total_count: number;
}

export default function QuantumDashboard() {
  const dispatch =
    useDispatch<AppDispatch>();

  const {
    performance,
    graph,
  } = useSelector(
    (state: RootState) =>
      state.quantum,
  );

  const [
    prompt,
    setPrompt,
  ] = useState('');

  const [
    autonomy,
    setAutonomy,
  ] = useState<Autonomy>(
    'average',
  );

  useEffect(() => {
    dispatch(fetchPerformance());
    dispatch(fetchGraph());
  }, [dispatch]);

  const handleProcess = () => {
    const trimmedPrompt =
      prompt.trim();

    if (!trimmedPrompt) {
      return;
    }

    dispatch(
      processGoal({
        prompt: trimmedPrompt,
        autonomy,
      }),
    );
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">
        🧠 Quantum Dashboard
      </h2>

      <section className="rounded-lg border border-[#334155] bg-[#1e293b] p-4">
        <h3 className="font-semibold">
          Process New Goal
        </h3>

        <div className="mt-2 flex flex-wrap gap-2">
          <Input
            aria-label="Goal"
            className="min-w-[240px] flex-1"
            placeholder="Enter your goal..."
            value={prompt}
            onChange={(event) =>
              setPrompt(
                event.target.value,
              )
            }
            onKeyDown={(event) => {
              if (
                event.key === 'Enter'
              ) {
                event.preventDefault();
                handleProcess();
              }
            }}
          />

          <select
            aria-label="Autonomy level"
            className="rounded-lg border border-[#334155] bg-[#0f172a] p-2 text-white"
            value={autonomy}
            onChange={(event) =>
              setAutonomy(
                event.target
                  .value as Autonomy,
              )
            }
          >
            <option value="min">
              🛑 Min – Ask before every task
            </option>

            <option value="average">
              ⚖️ Average – Ask for high-impact actions
            </option>

            <option value="high">
              🚀 High – Ask only for deployment
            </option>

            <option value="full">
              🧠 Full – No approvals
            </option>
          </select>

          <Button
            type="button"
            onClick={handleProcess}
            disabled={!prompt.trim()}
          >
            Run
          </Button>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className="col-span-2 rounded-lg border border-[#334155] bg-[#1e293b] p-4">
          <h4 className="mb-2 font-semibold">
            Knowledge Graph
          </h4>

          <div className="h-64 overflow-auto">
            <KnowledgeGraphVis
              nodes={graph.nodes}
              edges={graph.edges}
            />
          </div>
        </section>

        <section className="rounded-lg border border-[#334155] bg-[#1e293b] p-4">
          <h4 className="mb-2 font-semibold">
            Model Performance
          </h4>

          <div className="space-y-2 text-sm">
            {performance.map(
              (
                item: PerformanceItem,
              ) => (
                <div
                  key={`${item.model_name}-${item.task_type}`}
                  className="flex justify-between border-b border-[#334155] py-1"
                >
                  <span>
                    {item.model_name}{' '}
                    ({item.task_type})
                  </span>

                  <span className="text-gray-400">
                    success:{' '}
                    {item.success_count}/
                    {item.total_count}
                  </span>
                </div>
              ),
            )}
          </div>
        </section>
      </div>
    </div>
  );
}