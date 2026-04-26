import { useEffect, useRef } from 'react';
import type { AgentStatus, ChatMessage } from '../../hooks/useChat';
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
    <div className="scrollbar-hidden flex h-full flex-col gap-6 overflow-y-auto pr-1">
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
