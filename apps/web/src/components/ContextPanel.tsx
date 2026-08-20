import {
  useState,
} from 'react';

import {
  useDispatch,
} from 'react-redux';

import {
  Button,
  Input,
} from '@nevo/ui';

import {
  updateContext,
} from '../store/slices/currentProjectSlice';

import type {
  AppDispatch,
} from '../store';

interface ContextPanelProps {
  projectId: string;
  context: Record<
    string,
    unknown
  >;
}

export default function ContextPanel({
  projectId,
  context,
}: ContextPanelProps) {
  const dispatch =
    useDispatch<AppDispatch>();

  const [
    editKey,
    setEditKey,
  ] = useState('');

  const [
    editValue,
    setEditValue,
  ] = useState('');

  const addOrUpdate = () => {
    const key = editKey.trim();

    if (!key) {
      return;
    }

    dispatch(
      updateContext({
        [key]: editValue,
      }),
    );

    setEditKey('');
    setEditValue('');
  };

  return (
    <div className="rounded-lg border border-[#1e293b] bg-[#0f172a] p-3">
      <h4 className="mb-2 text-sm font-semibold">
        🧠 Context{' '}
        {projectId || 'Unknown'}
      </h4>

      <div className="max-h-40 space-y-1 overflow-auto text-sm">
        {Object.entries(context).map(
          ([key, value]) => (
            <div
              key={key}
              className="flex items-center justify-between border-b border-[#1e293b] py-1"
            >
              <span className="text-blue-400">
                {key}:
              </span>

              <span className="text-right text-gray-300">
                {typeof value === 'string'
                  ? value
                  : JSON.stringify(
                      value,
                    )}
              </span>
            </div>
          ),
        )}

        {Object.keys(context).length ===
          0 && (
          <span className="text-xs text-gray-500">
            No context stored.
          </span>
        )}
      </div>

      <div className="mt-2 flex gap-2">
        <Input
          aria-label="Context key"
          className="flex-1 text-xs"
          placeholder="Key"
          value={editKey}
          onChange={(event) =>
            setEditKey(
              event.target.value,
            )
          }
          onKeyDown={(event) => {
            if (
              event.key === 'Enter'
            ) {
              event.preventDefault();
              addOrUpdate();
            }
          }}
        />

        <Input
          aria-label="Context value"
          className="flex-1 text-xs"
          placeholder="Value"
          value={editValue}
          onChange={(event) =>
            setEditValue(
              event.target.value,
            )
          }
          onKeyDown={(event) => {
            if (
              event.key === 'Enter'
            ) {
              event.preventDefault();
              addOrUpdate();
            }
          }}
        />

        <Button
          type="button"
          disabled={!editKey.trim()}
          onClick={addOrUpdate}
          className="px-2 py-1 text-xs"
        >
          Add
        </Button>
      </div>
    </div>
  );
}