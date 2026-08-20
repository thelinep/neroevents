import {
  useState,
} from 'react';

import {
  Button,
  Input,
} from '@nevo/ui';

import converse from '../api';

interface AgentMessage {
  role: string;
  content: string;
}

interface AgentChatProps {
  projectId?: string;
}

export default function AgentChat({
  projectId,
}: AgentChatProps) {
  const [
    messages,
    setMessages,
  ] = useState<AgentMessage[]>([]);

  const [
    input,
    setInput,
  ] = useState('');

  const [
    loading,
    setLoading,
  ] = useState(false);

  const handleSend = async () => {
    const message = input.trim();

    if (!message || loading) {
      return;
    }

    setLoading(true);

    try {
      const res = await converse(
        message,
      );

      const responseMessages =
        Array.isArray(
          res.data?.messages,
        )
          ? res.data.messages
          : [];

      setMessages(
        (previous) => [
          ...previous,
          {
            role: 'user',
            content: message,
          },
          ...responseMessages,
        ],
      );

      setInput('');
    } catch (error) {
      console.error(
        'Conversation failed',
        error,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-64 flex-col rounded-lg border border-[#1e293b] bg-[#0f172a] p-3">
      {projectId && (
        <div className="mb-1 text-xs text-gray-400">
          Project ID: {projectId}
        </div>
      )}

      <div
        className="flex-1 space-y-1 overflow-auto text-sm"
        aria-live="polite"
      >
        {messages.map(
          (message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={
                message.role === 'user'
                  ? 'text-right'
                  : 'text-left'
              }
            >
              <span className="font-bold text-blue-400">
                {message.role}:
              </span>{' '}
              {message.content}
            </div>
          ),
        )}
      </div>

      <div className="mt-2 flex gap-2">
        <Input
          aria-label="Message"
          className="flex-1 text-sm"
          placeholder="Message..."
          value={input}
          disabled={loading}
          onChange={(event) =>
            setInput(
              event.target.value,
            )
          }
          onKeyDown={(event) => {
            if (
              event.key === 'Enter' &&
              !event.shiftKey
            ) {
              event.preventDefault();
              void handleSend();
            }
          }}
        />

        <Button
          type="button"
          disabled={
            loading ||
            !input.trim()
          }
          onClick={() => {
            void handleSend();
          }}
          className="px-3 py-1 text-sm"
        >
          {loading
            ? 'Sending...'
            : 'Send'}
        </Button>
      </div>
    </div>
  );
}