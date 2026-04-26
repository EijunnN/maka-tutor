import { useEffect, useRef } from 'react';
import type { AgentStatus, ChatMessage } from '../../hooks/useAgent';
import { MessageBubble } from './MessageBubble';

interface Props {
  messages: ChatMessage[];
  status: AgentStatus;
}

export function MessageList({ messages, status }: Props) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, status]);

  const lastAssistant =
    [...messages].reverse().find((m) => m.role === 'assistant') ?? null;

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }}>
      {messages.map((m) => (
        <MessageBubble
          key={m.id}
          message={m}
          streaming={status === 'streaming' && m.id === lastAssistant?.id}
        />
      ))}
      {status === 'thinking' && (
        <div className="flex items-center gap-1.5 px-1 text-xs text-zinc-500">
          <span className="size-1 animate-pulse rounded-full bg-violet-300" />
          <span className="size-1 animate-pulse rounded-full bg-violet-300 [animation-delay:150ms]" />
          <span className="size-1 animate-pulse rounded-full bg-violet-300 [animation-delay:300ms]" />
        </div>
      )}
      <div ref={endRef} />
    </div>
  );
}
