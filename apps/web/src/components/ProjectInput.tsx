import {
  useRef,
  useState,
  type ChangeEvent,
  type SubmitEvent,
} from 'react';

import {
  Button,
  Input,
  Radio,
  Textarea,
} from '@nevo/ui';

import api from '../api';

type InputMethod =
  | 'describe'
  | 'zip'
  | 'folder'
  | 'github';

interface GeneratedRoadmapResponse {
  tasks?: unknown[];
}

interface ProjectInputProps {
  onTasksGenerated?: (
    tasks: unknown[],
  ) => void;
}

interface GenerateProjectBody {
  description: string;
  provider: string;
  folderPath?: string;
  githubUrl?: string;
}

export default function ProjectInput({
  onTasksGenerated,
}: ProjectInputProps) {
  const [method, setMethod] =
    useState<InputMethod>('describe');

  const [description, setDescription] =
    useState('');

  const [folderPath, setFolderPath] =
    useState('');

  const [githubUrl, setGithubUrl] =
    useState('');

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState('');

  const fileInput =
    useRef<HTMLInputElement>(null);

  const handleFileChange = (
    event: ChangeEvent<HTMLInputElement>,
  ): void => {
    if (
      !event.target.files ||
      event.target.files.length === 0
    ) {
      setError('Please select a ZIP file.');
      return;
    }

    setError('');
  };

  const handleSubmit = async (
    event: SubmitEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();

    if (
      method === 'describe' &&
      !description.trim()
    ) {
      setError('Please enter a description.');
      return;
    }

    if (
      method === 'folder' &&
      !folderPath.trim()
    ) {
      setError('Please enter a folder path.');
      return;
    }

    if (
      method === 'github' &&
      !githubUrl.trim()
    ) {
      setError('Please enter a GitHub URL.');
      return;
    }

    if (method === 'zip') {
      const file =
        fileInput.current?.files?.[0];

      if (!file) {
        setError('Please select a ZIP file.');
        return;
      }
    }

    setLoading(true);
    setError('');

    try {
      if (method === 'zip') {
        const file =
          fileInput.current?.files?.[0];

        if (!file) {
          setError('Please select a ZIP file.');
          return;
        }

        const formData = new FormData();

        formData.append('file', file);
        formData.append(
          'description',
          description,
        );

        const response =
          await api.post<GeneratedRoadmapResponse>(
            '/api/project/upload-zip',
            formData,
            {
              headers: {
                'Content-Type':
                  'multipart/form-data',
              },
            },
          );

        onTasksGenerated?.(
          response.data.tasks ?? [],
        );

        return;
      }

      const body: GenerateProjectBody = {
        description,
        provider: 'ollama',
      };

      if (method === 'folder') {
        body.folderPath = folderPath;
      }

      if (method === 'github') {
        body.githubUrl = githubUrl;
      }

      const response =
        await api.post<GeneratedRoadmapResponse>(
          '/api/project/generate',
          body,
        );

      onTasksGenerated?.(
        response.data.tasks ?? [],
      );
    } catch (cause: unknown) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Failed to generate roadmap.',
      );
    } finally {
      setLoading(false);
    }
  };

  const methods: ReadonlyArray<{
    value: InputMethod;
    label: string;
  }> = [
    {
      value: 'describe',
      label: 'Describe',
    },
    {
      value: 'zip',
      label: 'ZIP',
    },
    {
      value: 'folder',
      label: 'Folder',
    },
    {
      value: 'github',
      label: 'GitHub',
    },
  ];

  return (
    <div className="rounded-lg border border-[#1e293b] bg-[#0f172a] p-4">
      <h3 className="mb-3 text-lg font-semibold">
        Generate Roadmap
      </h3>

      <form
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        <fieldset>
          <legend className="sr-only">
            Project input method
          </legend>

          <div className="flex flex-wrap gap-4">
            {methods.map((item) => (
              <label
                key={item.value}
                className="flex cursor-pointer items-center gap-2 text-sm"
              >
          <Radio
  name="project-input-method"
  value={item.value}
  checked={method === item.value}
  aria-label={item.label}
  onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
    setMethod(event.target.value as InputMethod);
  }}
/>

                <span>{item.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {method === 'describe' && (
          <Textarea
            aria-label="Project description"
            placeholder="Describe your project..."
            rows={4}
            value={description}
            onChange={(
              event: ChangeEvent<HTMLTextAreaElement>,
            ) =>
              setDescription(
                event.target.value,
              )
            }
          />
        )}

        {method === 'zip' && (
          <Input
            ref={fileInput}
            id="project-zip"
            type="file"
            accept=".zip"
            aria-label="Project ZIP file"
            onChange={handleFileChange}
          />
        )}

        {method === 'folder' && (
          <Input
            aria-label="Folder path"
            placeholder="/path/to/folder"
            value={folderPath}
            onChange={(
              event: ChangeEvent<HTMLInputElement>,
            ) =>
              setFolderPath(
                event.target.value,
              )
            }
          />
        )}

        {method === 'github' && (
          <Input
            aria-label="GitHub URL"
            placeholder="https://github.com/user/repo.git"
            value={githubUrl}
            onChange={(
              event: ChangeEvent<HTMLInputElement>,
            ) =>
              setGithubUrl(
                event.target.value,
              )
            }
          />
        )}

        {error && (
          <div
            role="alert"
            className="text-sm text-red-400"
          >
            {error}
          </div>
        )}

        <Button
          type="submit"
          disabled={loading}
        >
          {loading
            ? 'Generating...'
            : 'Generate Roadmap'}
        </Button>
      </form>
    </div>
  );
}