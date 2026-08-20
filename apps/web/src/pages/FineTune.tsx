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
  fetchFineTuneJobs,
  startFineTune,
  fetchDatasets,
} from '../store/slices/fineTuneSlice';

import type {
  RootState,
  AppDispatch,
} from '../store';

interface FineTuneDataset {
  id: string;
  name: string;
}

interface FineTuneJob {
  id: string;
  name?: string;
  base_model: string;
  status: string;
  created_at: string;
}

export default function FineTune() {
  const dispatch =
    useDispatch<AppDispatch>();

  const {
    jobs,
    datasets,
  } = useSelector(
    (state: RootState) =>
      state.fineTune,
  );

  const [
    baseModel,
    setBaseModel,
  ] = useState(
    'gemini-1.5-flash',
  );

  const [
    dataset,
    setDataset,
  ] = useState('');

  const [
    jobName,
    setJobName,
  ] = useState('');

  useEffect(() => {
    dispatch(fetchFineTuneJobs());
    dispatch(fetchDatasets());
  }, [dispatch]);

  const handleStart = () => {
    if (!dataset) {
      return;
    }

    dispatch(
      startFineTune({
        baseModel,
        datasetId: dataset,
        name: jobName,
      }),
    );
  };

  return (
    <div>
      <h2 className="mb-4 text-2xl font-bold">
        🔬 Fine-Tune Models
      </h2>

      <section className="mb-4 rounded-lg border border-[#334155] bg-[#1e293b] p-4">
        <h3 className="font-semibold">
          Start New Fine-Tuning Job
        </h3>

        <div className="mt-2 flex flex-wrap gap-4">
          <Input
            aria-label="Job Name"
            className="min-w-[220px] flex-1"
            placeholder="Job Name"
            value={jobName}
            onChange={(event) =>
              setJobName(
                event.target.value,
              )
            }
          />

          <select
            aria-label="Base model"
            className="rounded-lg border border-[#334155] bg-[#0f172a] p-2 text-white"
            value={baseModel}
            onChange={(event) =>
              setBaseModel(
                event.target.value,
              )
            }
          >
            <option value="gemini-1.5-flash">
              Gemini 1.5 Flash
            </option>

            <option value="llama3.2">
              Llama 3.2
            </option>

            <option value="gpt-4o-mini">
              GPT-4o Mini
            </option>
          </select>

          <select
            aria-label="Dataset"
            className="rounded-lg border border-[#334155] bg-[#0f172a] p-2 text-white"
            value={dataset}
            onChange={(event) =>
              setDataset(
                event.target.value,
              )
            }
          >
            <option value="">
              Select dataset
            </option>

            {datasets.map(
              (
                item: FineTuneDataset,
              ) => (
                <option
                  key={item.id}
                  value={item.id}
                >
                  {item.name}
                </option>
              ),
            )}
          </select>

          <Button
            type="button"
            onClick={handleStart}
            disabled={!dataset}
          >
            Start Job
          </Button>
        </div>
      </section>

      <div className="space-y-2">
        {jobs.map(
          (job: FineTuneJob) => (
            <div
              key={job.id}
              className="flex justify-between rounded-lg border border-[#334155] bg-[#1e293b] p-3"
            >
              <div>
                <span className="font-semibold">
                  {job.name || job.id}
                </span>

                <span className="ml-2 text-sm text-gray-400">
                  {job.base_model}
                </span>

                <span
                  className={[
                    'ml-2 rounded px-2 py-0.5 text-xs',
                    job.status ===
                    'completed'
                      ? 'bg-green-500/20 text-green-400'
                      : job.status ===
                        'running'
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-gray-500/20 text-gray-400',
                  ].join(' ')}
                >
                  {job.status}
                </span>
              </div>

              <span className="text-sm text-gray-500">
                {new Date(
                  job.created_at,
                ).toLocaleString()}
              </span>
            </div>
          ),
        )}

        {jobs.length === 0 && (
          <p className="text-sm text-gray-500">
            No fine-tuning jobs yet.
          </p>
        )}
      </div>
    </div>
  );
}