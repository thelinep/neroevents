import {
  useEffect,
  useState,
  type ChangeEvent,
  type SubmitEvent,
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
  fetchModels,
  createModel,
  deleteModel,
  testModel,
} from '../store/slices/modelsSlice';

import {
  fetchAgents,
} from '../store/slices/agentsSlice';

import type {
  AppDispatch,
  RootState,
} from '../store';

import {
  Plus,
  Trash2,
  Play,
} from 'lucide-react';

interface ModelConfig {
  models?: string[];
  strategy?: string;
  [key: string]: unknown;
}

interface Model {
  id: string;
  name: string;
  description?: string;
  type: string;
  config?: ModelConfig;
}

interface Agent {
  id: string;
  name: string;
}

interface ModelFormProps {
  available: Agent[];
  onCancel: () => void;
}

interface TestModelPayload {
  result?: string;
}

export default function ModelStudio() {
  const dispatch =
    useDispatch<AppDispatch>();

  const {
    items,
  } = useSelector(
    (state: RootState) =>
      state.models,
  );

  const {
    items: agents,
  } = useSelector(
    (state: RootState) =>
      state.agents,
  );

  const [showForm, setShowForm] =
    useState(false);

  const [testResult, setTestResult] =
    useState('');

  useEffect(() => {
    void dispatch(fetchModels());
    void dispatch(fetchAgents());
  }, [dispatch]);

  const handleTest = async (
    config: ModelConfig | undefined,
  ): Promise<void> => {
    const action =
      await dispatch(
        testModel(config),
      );

    const payload =
      action.payload as
        | TestModelPayload
        | undefined;

    setTestResult(
      payload?.result ??
        'Test completed',
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <h2 className="text-2xl font-bold">
          🧠 Model Studio
        </h2>

        <Button
          type="button"
          onClick={() =>
            setShowForm(true)
          }
        >
          <Plus size={18} />
          New Custom Model
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {items.map(
          (model: Model) => (
            <div
              key={model.id}
              className="rounded bg-[#1e293b] p-4"
            >
              <h3 className="font-semibold">
                {model.name}
              </h3>

              <p className="text-sm text-gray-400">
                {model.description}
              </p>

              <p className="text-xs text-gray-500">
                Type: {model.type}
                {' | '}
                Strategy:{' '}
                {
                  model.config
                    ?.strategy
                }
              </p>

              <div className="mt-2 flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() =>
                    void handleTest(
                      model.config,
                    )
                  }
                >
                  <Play size={16} />
                  Test
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  aria-label={`Delete ${model.name}`}
                  onClick={() => {
                    void dispatch(
                      deleteModel(
                        model.id,
                      ),
                    );
                  }}
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>
          ),
        )}
      </div>

      {testResult && (
        <div className="rounded border border-[#1e293b] bg-[#0a0e1a] p-4">
          <h4 className="font-semibold">
            Test Output
          </h4>

          <p className="text-sm text-gray-300">
            {testResult}
          </p>
        </div>
      )}

      {showForm && (
        <ModelForm
          available={agents}
          onCancel={() =>
            setShowForm(false)
          }
        />
      )}
    </div>
  );
}

function ModelForm({
  available,
  onCancel,
}: ModelFormProps) {
  const dispatch =
    useDispatch<AppDispatch>();

  const [name, setName] =
    useState('');

  const [description, setDescription] =
    useState('');

  const [strategy, setStrategy] =
    useState('majority_vote');

  const [
    selectedModels,
    setSelectedModels,
  ] = useState<string[]>([]);

  const handleSubmit = (
    event: SubmitEvent<HTMLFormElement>,
  ): void => {
    event.preventDefault();

    void dispatch(
      createModel({
        name,
        description,
        type: 'ensemble',
        config: {
          models: selectedModels,
          strategy,
        },
      }),
    );

    onCancel();
  };

  const handleStrategyChange = (
    event: ChangeEvent<HTMLSelectElement>,
  ): void => {
    setStrategy(
      event.target.value,
    );
  };

  const handleModelChange = (
    event: ChangeEvent<HTMLInputElement>,
    agentId: string,
  ): void => {
    setSelectedModels(
      (current) => {
        if (event.target.checked) {
          return current.includes(
            agentId,
          )
            ? current
            : [...current, agentId];
        }

        return current.filter(
          (id) => id !== agentId,
        );
      },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-xl rounded bg-[#0f172a] p-6">
        <h3 className="mb-4 text-xl font-bold">
          New Composite Model
        </h3>

        <form
          onSubmit={handleSubmit}
          className="space-y-3"
        >
          <Input
            aria-label="Model name"
            placeholder="Name"
            value={name}
            required
            onChange={(
              event: ChangeEvent<HTMLInputElement>,
            ) =>
              setName(
                event.target.value,
              )
            }
          />

          <Input
            aria-label="Model description"
            placeholder="Description"
            value={description}
            onChange={(
              event: ChangeEvent<HTMLInputElement>,
            ) =>
              setDescription(
                event.target.value,
              )
            }
          />

          <select
            aria-label="Strategy"
            className="w-full rounded-lg border border-[#334155] bg-[#1e293b] p-2 text-white"
            value={strategy}
            onChange={
              handleStrategyChange
            }
          >
            <option value="majority_vote">
              Majority Vote
            </option>

            <option value="chain">
              Chain
            </option>

            <option value="router">
              Router
            </option>
          </select>

          <fieldset>
            <legend className="mb-2 text-sm font-medium">
              Models
            </legend>

            <div className="flex flex-wrap gap-2">
              {available.map(
                (agent: Agent) => (
                  <label
                    key={agent.id}
                    className="flex items-center gap-2 rounded bg-[#1e293b] px-2 py-1"
                  >
                    <input
                      type="checkbox"
                      checked={selectedModels.includes(
                        agent.id,
                      )}
                      onChange={(
                        event,
                      ) =>
                        handleModelChange(
                          event,
                          agent.id,
                        )
                      }
                    />

                    {agent.name}
                  </label>
                ),
              )}
            </div>
          </fieldset>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onCancel}
            >
              Cancel
            </Button>

            <Button type="submit">
              Save Model
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}