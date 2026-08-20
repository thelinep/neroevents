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
  fetchTraces,
  pause,
  resume,
  stepOver,
  stepInto,
  setBreakpoint,
  removeBreakpoint,
} from '../store/slices/debugSlice';

import type {
  RootState,
  AppDispatch,
} from '../store';

import {
  Play,
  Pause,
  StepForward,
  CornerDownRight,
} from 'lucide-react';

interface DebugTrace {
  id: string | number;
  node_type: string;
  metadata?: {
    phase?: string;
  };
}

export default function DebugConsole() {
  const dispatch =
    useDispatch<AppDispatch>();

  const {
    traces,
    breakpoints,
  } = useSelector(
    (state: RootState) =>
      state.debug,
  );

  const [
    sessionId,
  ] = useState(() =>
    crypto.randomUUID(),
  );

  const [
    target,
    setTarget,
  ] = useState('');

  useEffect(() => {
    dispatch(
      fetchTraces(sessionId),
    );
  }, [
    dispatch,
    sessionId,
  ]);

  const handleAddBreakpoint =
    () => {
      const value =
        target.trim();

      if (!value) {
        return;
      }

      dispatch(
        setBreakpoint({
          target: value,
        }),
      );

      setTarget('');
    };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">
        🐞 Debug Console
      </h2>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={() =>
            dispatch(pause())
          }
          className="bg-yellow-500 text-black hover:bg-yellow-400"
        >
          <Pause
            size={16}
            aria-hidden="true"
          />
          Pause
        </Button>

        <Button
          type="button"
          onClick={() =>
            dispatch(resume())
          }
          className="bg-green-500 hover:bg-green-600"
        >
          <Play
            size={16}
            aria-hidden="true"
          />
          Resume
        </Button>

        <Button
          type="button"
          onClick={() =>
            dispatch(stepOver())
          }
          className="bg-blue-500 hover:bg-blue-600"
        >
          <StepForward
            size={16}
            aria-hidden="true"
          />
          Step Over
        </Button>

        <Button
          type="button"
          onClick={() =>
            dispatch(stepInto())
          }
          className="bg-purple-500 hover:bg-purple-600"
        >
          <CornerDownRight
            size={16}
            aria-hidden="true"
          />
          Step Into
        </Button>
      </div>

      <section className="rounded-lg border border-[#334155] bg-[#1e293b] p-4">
        <h4 className="font-semibold">
          Breakpoints
        </h4>

        <div className="mt-1 flex gap-2">
          <Input
            aria-label="Breakpoint target"
            className="text-sm"
            placeholder="task:123"
            value={target}
            onChange={(event) =>
              setTarget(
                event.target.value,
              )
            }
            onKeyDown={(event) => {
              if (
                event.key === 'Enter'
              ) {
                event.preventDefault();
                handleAddBreakpoint();
              }
            }}
          />

          <Button
            type="button"
            onClick={
              handleAddBreakpoint
            }
            disabled={!target.trim()}
          >
            Add
          </Button>
        </div>

        <ul className="mt-2 space-y-1 text-sm">
          {breakpoints.map(
            (breakpoint: string) => (
              <li
                key={breakpoint}
                className="flex items-center justify-between"
              >
                <span>
                  {breakpoint}
                </span>

                <Button
                  type="button"
                  aria-label={`Remove breakpoint ${breakpoint}`}
                  onClick={() =>
                    dispatch(
                      removeBreakpoint(
                        breakpoint,
                      ),
                    )
                  }
                  className="px-2 py-1 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                >
                  ✕
                </Button>
              </li>
            ),
          )}
        </ul>
      </section>

      <section className="h-64 overflow-y-auto rounded-lg border border-[#1e293b] bg-[#0f172a] p-4 font-mono text-xs">
        <div className="space-y-1">
          {traces.map(
            (
              trace: DebugTrace,
            ) => (
              <div
                key={trace.id}
                className="border-b border-[#1e293b] py-1"
              >
                <span className="text-blue-400">
                  {trace.node_type}
                </span>

                {' – '}

                <span className="text-gray-300">
                  {trace.metadata?.phase ??
                    '—'}
                </span>
              </div>
            ),
          )}

          {traces.length === 0 && (
            <p className="text-gray-500">
              No debug traces yet.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}