import {
  useEffect,
  useRef,
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
  fetchAgents,
} from '../store/slices/agentsSlice';

import type {
  RootState,
  AppDispatch,
} from '../store';

import {
  addMessage,
  clearMessages,
  setIsRunning,
} from '../store/slices/playgroundSlice';

type PlaygroundMode =
  | 'round-robin'
  | 'directed';

interface Agent {
  id: string;
  name: string;
}

interface PlaygroundMessage {
  role: string;
  content: string;
  isSummary?: boolean;
}

interface AgentTurnEvent {
  type: 'agent_turn';
  agent: string;
  content: string;
}

interface SummaryEvent {
  type: 'summary';
  content: string;
}

type PlaygroundEvent =
  | AgentTurnEvent
  | SummaryEvent;

export default function Playground() {
  const dispatch =
    useDispatch<AppDispatch>();

  const {
    items: agents,
  } = useSelector(
    (state: RootState) =>
      state.agents,
  );

  const {
    messages,
    isRunning,
  } = useSelector(
    (state: RootState) =>
      state.playground,
  );

  const [
    selectedAgents,
    setSelectedAgents,
  ] = useState<string[]>([]);

  const [
    userPrompt,
    setUserPrompt,
  ] = useState('');

  const [
    mode,
    setMode,
  ] = useState<PlaygroundMode>(
    'round-robin',
  );

  const [
    maxTurns,
    setMaxTurns,
  ] = useState(5);

  const eventSourceRef =
    useRef<EventSource | null>(
      null,
    );

  useEffect(() => {
    dispatch(fetchAgents());

    return () => {
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
    };
  }, [dispatch]);

  const toggleAgent = (
    agentId: string,
    checked: boolean,
  ) => {
    setSelectedAgents(
      (current) =>
        checked
          ? current.includes(agentId)
            ? current
            : [...current, agentId]
          : current.filter(
              (id) =>
                id !== agentId,
            ),
    );
  };

  const startConversation = () => {
    if (
      selectedAgents.length < 2
    ) {
      window.alert(
        'Select at least two agents.',
      );
      return;
    }

    if (!userPrompt.trim()) {
      return;
    }

    eventSourceRef.current?.close();

    dispatch(clearMessages());
    dispatch(setIsRunning(true));

    const params =
      new URLSearchParams({
        agentIds:
          selectedAgents.join(','),
        userPrompt:
          userPrompt.trim(),
        mode,
        maxTurns:
          String(maxTurns),
      });

    const eventSource =
      new EventSource(
        `/api/playground/converse?${params.toString()}`,
      );

    eventSourceRef.current =
      eventSource;

    eventSource.onmessage = (
      event,
    ) => {
      try {
        const data =
          JSON.parse(
            event.data,
          ) as PlaygroundEvent;

        if (
          data.type ===
          'agent_turn'
        ) {
          dispatch(
            addMessage({
              role: data.agent,
              content:
                data.content,
            }),
          );

          return;
        }

        if (
          data.type === 'summary'
        ) {
          dispatch(
            addMessage({
              role: 'Summary',
              content:
                data.content,
              isSummary: true,
            }),
          );

          dispatch(
            setIsRunning(false),
          );

          eventSource.close();
          eventSourceRef.current =
            null;
        }
      } catch (error) {
        console.error(
          'Invalid playground event',
          error,
        );

        dispatch(
          setIsRunning(false),
        );

        eventSource.close();
        eventSourceRef.current =
          null;
      }
    };

    eventSource.onerror = () => {
      dispatch(
        setIsRunning(false),
      );

      eventSource.close();
      eventSourceRef.current =
        null;
    };
  };

  const stopConversation = () => {
    eventSourceRef.current?.close();
    eventSourceRef.current = null;

    dispatch(
      setIsRunning(false),
    );
  };

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <h2 className="text-2xl font-bold">
          Agent Playground
        </h2>

        <div className="flex flex-wrap gap-2">
          {agents.map(
            (agent: Agent) => {
              const checked =
                selectedAgents.includes(
                  agent.id,
                );

              return (
                <label
                  key={agent.id}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#334155] bg-[#1e293b] px-2 py-1 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) =>
                      toggleAgent(
                        agent.id,
                        event.target
                          .checked,
                      )
                    }
                  />

                  {agent.name}
                </label>
              );
            },
          )}
        </div>

        <select
          aria-label="Conversation mode"
          className="rounded border border-[#334155] bg-[#1e293b] p-1 text-sm"
          value={mode}
          onChange={(event) =>
            setMode(
              event.target
                .value as PlaygroundMode,
            )
          }
        >
          <option value="round-robin">
            Round Robin
          </option>

          <option value="directed">
            Directed
          </option>
        </select>

        <Input
          aria-label="Maximum turns"
          type="number"
          min={1}
          className="w-20"
          value={maxTurns}
          onChange={(event) => {
            const value =
              Number.parseInt(
                event.target.value,
                10,
              );

            setMaxTurns(
              Number.isFinite(value) &&
                value > 0
                ? value
                : 1,
            );
          }}
        />
      </div>

      <div className="mb-2 flex gap-2">
        <Input
          aria-label="Your prompt"
          className="flex-1"
          placeholder="Your prompt..."
          value={userPrompt}
          disabled={isRunning}
          onChange={(event) =>
            setUserPrompt(
              event.target.value,
            )
          }
          onKeyDown={(event) => {
            if (
              event.key === 'Enter' &&
              !event.shiftKey
            ) {
              event.preventDefault();

              startConversation();
            }
          }}
        />

        <Button
          type="button"
          onClick={startConversation}
          disabled={
            isRunning ||
            !userPrompt.trim() ||
            selectedAgents.length < 2
          }
        >
          Start
        </Button>

        <Button
          type="button"
          onClick={stopConversation}
          disabled={!isRunning}
          className="bg-red-500 hover:bg-red-600"
        >
          Stop
        </Button>
      </div>

      <div
        className="flex-1 space-y-2 overflow-auto rounded border border-[#1e293b] bg-[#0a0e1a] p-4"
        aria-live="polite"
      >
        {messages.map(
          (
            message: PlaygroundMessage,
            index: number,
          ) => (
            <div
              key={`${message.role}-${index}`}
              className={[
                'rounded p-2',
                message.isSummary
                  ? 'border border-yellow-500/30 bg-[#2a3a4a]'
                  : 'bg-[#1e293b]',
              ].join(' ')}
            >
              <span className="font-bold text-blue-400">
                {message.role}:
              </span>{' '}
              {message.content}
            </div>
          ),
        )}
      </div>
    </div>
  );
}