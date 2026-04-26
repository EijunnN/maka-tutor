import { useEffect, useRef } from 'react';
import type { AgentStatus, ChatMessage } from '../../hooks/useChat';
import { MessageBubble } from './MessageBubble';

interface Props {
  messages: ChatMessage[];
  status: AgentStatus;
}

const STICK_THRESHOLD_PX = 80;

export function MessageList({ messages, status }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);

  // Auto-scroll instant cada vez que cambia algo, pero sólo si el
  // usuario está cerca del final. Si scrolló hacia arriba, no le
  // robamos el scroll mientras lee.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !stickToBottomRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, status]);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottomRef.current = distanceFromBottom < STICK_THRESHOLD_PX;
  };

  const lastAssistant =
    [...messages].reverse().find((m) => m.role === 'assistant') ?? null;

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="scrollbar-hidden flex h-full flex-col gap-6 overflow-y-auto pr-1"
    >
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
    </div>
  );
}
