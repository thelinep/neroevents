import { ComponentProps, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchAgents,
  createAgent,
  updateAgent,
  deleteAgent,
  shareAgent,
} from '../store/slices/agentsSlice';
import type { AppDispatch, RootState } from '../store';
import { Edit, Plus, Share2, Trash2 } from 'lucide-react';
import {
  Button,
  Input,
  Select,
  Textarea,
} from '@nevo/ui';

interface Agent {
  id: string;
  name: string;
  description?: string;
  system_prompt?: string;
  model_provider: string;
  model_name: string;
  temperature?: number;
  tools?: string[];
  shareToken?: string;
}

interface AgentFormData {
  name: string;
  description: string;
  system_prompt: string;
  model_provider: string;
  model_name: string;
  temperature: number;
  tools: string[];
}

interface AgentFormProps {
  initial: Agent | null;
  onSave: (data: AgentFormData) => Promise<void>;
  onCancel: () => void;
}

const MODEL_PROVIDER_OPTIONS = [
  { value: 'ollama', label: 'Ollama' },
  { value: 'gemini', label: 'Gemini' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
];

export default function Agents() {
  const dispatch = useDispatch<AppDispatch>();

  const { items, isLoading } = useSelector(
    (state: RootState) => state.agents,
  ) as {
    items: Agent[];
    isLoading: boolean;
  };

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Agent | null>(null);

  useEffect(() => {
    dispatch(fetchAgents());
  }, [dispatch]);

  const handleSave = async (data: AgentFormData): Promise<void> => {
    if (editing) {
      await dispatch(
        updateAgent({
          id: editing.id,
          data,
        }),
      );
    } else {
      await dispatch(createAgent(data));
    }

    setShowForm(false);
    setEditing(null);
  };

  const handleCreate = (): void => {
    setEditing(null);
    setShowForm(true);
  };

  const handleEdit = (agent: Agent): void => {
    setEditing(agent);
    setShowForm(true);
  };

  const handleCancel = (): void => {
    setShowForm(false);
    setEditing(null);
  };

  const handleDelete = (id: string): void => {
    void dispatch(deleteAgent(id));
  };

  const handleShare = (id: string): void => {
    void dispatch(shareAgent(id));
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">
          Custom Agents
        </h2>

        <Button
          type="button"
          onClick={handleCreate}
          className="flex items-center gap-2"
        >
          <Plus size={18} />
          Create Agent
        </Button>
      </div>

      {isLoading && (
        <p className="text-gray-400">
          Loading...
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((agent) => (
          <div
            key={agent.id}
            className="bg-[#1e293b] p-4 rounded-lg relative group"
          >
            <h3 className="font-semibold">
              {agent.name}
            </h3>

            <p className="text-sm text-gray-400">
              {agent.description || 'No description'}
            </p>

            <p className="text-xs text-gray-500 mt-1">
              Model: {agent.model_provider}/{agent.model_name}
            </p>

            <div className="mt-2 flex gap-2 items-center">
              <Button
                type="button"
                variant="ghost"
                aria-label={`Edit ${agent.name}`}
                onClick={() => handleEdit(agent)}
                className="text-blue-400 hover:text-blue-300"
              >
                <Edit size={16} />
              </Button>

              <Button
                type="button"
                variant="ghost"
                aria-label={`Delete ${agent.name}`}
                onClick={() => handleDelete(agent.id)}
                className="text-red-400 hover:text-red-300"
              >
                <Trash2 size={16} />
              </Button>

              <Button
                type="button"
                variant="ghost"
                aria-label={`Share ${agent.name}`}
                onClick={() => handleShare(agent.id)}
                className="text-green-400 hover:text-green-300"
              >
                <Share2 size={16} />
              </Button>

              {agent.shareToken && (
                <span className="text-xs text-gray-400 ml-2 truncate max-w-[100px]">
                  🔗 {agent.shareToken}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <AgentForm
          initial={editing}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
}

function AgentForm({
  initial,
  onSave,
  onCancel,
}: AgentFormProps) {
  const [name, setName] = useState(
    initial?.name ?? '',
  );

  const [description, setDescription] = useState(
    initial?.description ?? '',
  );

  const [systemPrompt, setSystemPrompt] = useState(
    initial?.system_prompt ?? '',
  );

  const [modelProvider, setModelProvider] = useState(
    initial?.model_provider ?? 'ollama',
  );

  const [modelName, setModelName] = useState(
    initial?.model_name ?? 'llama3.2',
  );

  const [temperature, setTemperature] = useState(
    initial?.temperature ?? 0.7,
  );

  const [tools, setTools] = useState(
    initial?.tools?.join(', ') ?? '',
  );

  const handleSubmit = (
    event: Parameters<
      NonNullable<
        ComponentProps<'form'>['onSubmit']
      >
    >[0],
  ): void => {
    event.preventDefault();

    void onSave({
      name,
      description,
      system_prompt: systemPrompt,
      model_provider: modelProvider,
      model_name: modelName,
      temperature: Number(temperature),
      tools: tools
        .split(',')
        .map((tool) => tool.trim())
        .filter(Boolean),
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[#0f172a] p-6 rounded-lg w-full max-w-2xl border border-[#1e293b]">
        <h3 className="text-xl font-bold mb-4">
          {initial ? 'Edit Agent' : 'New Agent'}
        </h3>

        <form
          onSubmit={handleSubmit}
          className="space-y-3"
        >
          <Input
            aria-label="Name"
            placeholder="Name"
            value={name}
            onChange={(event) =>
              setName(event.target.value)
            }
            required
          />

          <Input
            aria-label="Description"
            placeholder="Description"
            value={description}
            onChange={(event) =>
              setDescription(event.target.value)
            }
          />

          <Textarea
            aria-label="System prompt"
            placeholder="System prompt"
            value={systemPrompt}
            onChange={(event) =>
              setSystemPrompt(event.target.value)
            }
            rows={3}
          />

          <div className="flex gap-2">
            <Select
              aria-label="Model provider"
              value={modelProvider}
              options={MODEL_PROVIDER_OPTIONS}
              onChange={(event) =>
                setModelProvider(event.target.value)
              }
              className="flex-1"
            />

            <Input
              aria-label="Model name"
              placeholder="Model name"
              value={modelName}
              onChange={(event) =>
                setModelName(event.target.value)
              }
              className="flex-1"
            />
          </div>

          <Input
            aria-label="Temperature"
            type="number"
            step="0.1"
            min="0"
            max="2"
            placeholder="Temperature"
            value={String(temperature)}
            onChange={(event) =>
              setTemperature(
                Number(event.target.value),
              )
            }
          />

          <Input
            aria-label="Tools"
            placeholder="Tools (comma separated: file_read, web_search)"
            value={tools}
            onChange={(event) =>
              setTools(event.target.value)
            }
          />

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onCancel}
            >
              Cancel
            </Button>

            <Button type="submit">
              Save
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}