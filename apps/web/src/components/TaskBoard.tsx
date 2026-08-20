import {
  useSelector,
} from 'react-redux';

import {
  Button,
} from '@nevo/ui';

import type {
  RootState,
} from '../store';

import api from '../api';

interface TaskDiff {
  [file: string]: unknown;
}

interface TaskResult {
  diff?: TaskDiff;
  [key: string]: unknown;
}

interface Task {
  id: number;
  name: string;
  prompt: string;
  agent: string;
  type: string;
  status: string;
  files?: string[];
  result?: TaskResult;
  error?: string;
}

interface TaskBoardProps {
  tasks: Task[];
}

export default function TaskBoard({
  tasks,
}: TaskBoardProps) {
  const {
    project,
  } = useSelector(
    (state: RootState) =>
      state.currentProject,
  );

  const handleRun = async (
    taskId: number,
  ) => {
    if (!project) {
      return;
    }

    try {
      const res = await api.post(
        `/projects/${project.id}/tasks/${taskId}/run`,
      );

      console.log(
        'Run task response:',
        res.data,
      );
    } catch (error) {
      console.error(
        'Failed to run task',
        error,
      );
    }
  };

  const handleApprove = async (
    taskId: number,
  ) => {
    try {
      await api.post(
        `/tasks/${taskId}/approve`,
      );
    } catch (error) {
      console.error(
        'Failed to approve task',
        error,
      );
    }
  };

  const handleReject = async (
    taskId: number,
  ) => {
    try {
      await api.post(
        `/tasks/${taskId}/reject`,
      );
    } catch (error) {
      console.error(
        'Failed to reject task',
        error,
      );
    }
  };

  const getStatusClassName = (
    status: string,
  ) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400';

      case 'running':
        return 'bg-blue-500/20 text-blue-400';

      case 'awaiting_approval':
        return 'bg-purple-500/20 text-purple-400';

      case 'applied':
        return 'bg-green-500/20 text-green-400';

      default:
        return 'bg-red-500/20 text-red-400';
    }
  };

  return (
    <div className="space-y-2">
      {tasks.map((task) => (
        <div
          key={task.id}
          className="rounded-lg border border-[#334155] bg-[#1e293b] p-4"
        >
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-semibold">
                {task.name}
              </h4>

              <p className="text-sm text-gray-400">
                {task.prompt}
              </p>

              <div className="mt-1 flex gap-2 text-xs">
                <span className="rounded bg-[#0f172a] px-2 py-0.5">
                  Agent: {task.agent}
                </span>

                <span
                  className={[
                    'rounded px-2 py-0.5',
                    getStatusClassName(
                      task.status,
                    ),
                  ].join(' ')}
                >
                  {task.status}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              {task.status ===
                'pending' && (
                <Button
                  type="button"
                  onClick={() =>
                    void handleRun(
                      task.id,
                    )
                  }
                  className="px-3 py-1 text-sm"
                >
                  Run
                </Button>
              )}

              {task.status ===
                'awaiting_approval' && (
                <>
                  <Button
                    type="button"
                    onClick={() =>
                      void handleApprove(
                        task.id,
                      )
                    }
                    className="bg-green-500 px-3 py-1 text-sm hover:bg-green-600"
                  >
                    Approve
                  </Button>

                  <Button
                    type="button"
                    onClick={() =>
                      void handleReject(
                        task.id,
                      )
                    }
                    className="bg-red-500 px-3 py-1 text-sm hover:bg-red-600"
                  >
                    Reject
                  </Button>
                </>
              )}
            </div>
          </div>

          {task.result?.diff && (
            <details className="mt-2">
              <summary className="cursor-pointer text-sm text-blue-400">
                View Diff
              </summary>

              <pre className="max-h-40 overflow-auto rounded bg-[#0f172a] p-2 text-xs">
                {JSON.stringify(
                  task.result.diff,
                  null,
                  2,
                )}
              </pre>
            </details>
          )}

          {task.error && (
            <div className="mt-2 text-sm text-red-400">
              Error: {task.error}
            </div>
          )}
        </div>
      ))}

      {tasks.length === 0 && (
        <p className="text-gray-400">
          No tasks yet. Generate a
          roadmap first.
        </p>
      )}
    </div>
  );
}