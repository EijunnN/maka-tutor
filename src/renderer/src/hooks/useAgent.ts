import { useCallback, useEffect, useRef, useState } from 'react';
import type { ScreenshotEvent, SendTurnPayload } from '@shared/types';

export type Role = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: Role;
  text: string;
  shots?: ScreenshotEvent[];
  createdAt: number;
}

export type AgentStatus = 'idle' | 'thinking' | 'streaming';

let counter = 0;
function nextId(): string {
  counter += 1;
  return `m-${Date.now().toString(36)}-${counter}`;
}

export function useAgent() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<AgentStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const currentAssistantId = useRef<string | null>(null);

  useEffect(() => {
    const offStart = window.events.onAgentTurnStart(() => {
      setStatus('thinking');
      setError(null);
    });

    const offMessage = window.events.onAgentMessage(({ text }) => {
      setStatus('streaming');
      setMessages((prev) => {
        const id = currentAssistantId.current;
        if (id) {
          return prev.map((m) => (m.id === id ? { ...m, text: m.text + text } : m));
        }
        const newId = nextId();
        currentAssistantId.current = newId;
        return [...prev, { id: newId, role: 'assistant', text, createdAt: Date.now() }];
      });
    });

    const offEnd = window.events.onAgentTurnEnd(() => {
      currentAssistantId.current = null;
      setStatus('idle');
    });

    const offCancelled = window.events.onAgentTurnCancelled(() => {
      currentAssistantId.current = null;
      setStatus('idle');
    });

    const offError = window.events.onAgentError(({ message }) => {
      currentAssistantId.current = null;
      setStatus('idle');
      setError(message);
    });

    return () => {
      offStart();
      offMessage();
      offEnd();
      offCancelled();
      offError();
    };
  }, []);

  const send = useCallback(async (text: string, shots: ScreenshotEvent[]) => {
    if (status !== 'idle') return;
    const userMsg: ChatMessage = {
      id: nextId(),
      role: 'user',
      text,
      shots: shots.length > 0 ? shots : undefined,
      createdAt: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setError(null);
    setStatus('thinking');
    currentAssistantId.current = null;

    const payload: SendTurnPayload = {
      text,
      screenshots: shots.map((s) => ({ path: s.path, width: s.width, height: s.height })),
    };

    try {
      await window.api.sendTurn(payload);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setStatus('idle');
    }
  }, [status]);

  const cancel = useCallback(async () => {
    await window.api.cancelTurn();
  }, []);

  const reset = useCallback(async () => {
    await window.api.resetSession();
    setMessages([]);
    setError(null);
    setStatus('idle');
    currentAssistantId.current = null;
  }, []);

  return { messages, status, error, send, cancel, reset };
}
