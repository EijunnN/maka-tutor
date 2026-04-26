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
  const pendingDelta = useRef('');
  const flushRaf = useRef(0);

  // Aplica los deltas acumulados al state. Llamado vía rAF para
  // coalescer hasta el repaint (≤60fps), evitando re-renders frenéticos.
  const flushDeltas = useCallback(() => {
    flushRaf.current = 0;
    const text = pendingDelta.current;
    pendingDelta.current = '';
    if (!text) return;
    const id = currentAssistantId.current;
    if (!id) return;
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, text: m.text + text } : m)),
    );
  }, []);

  useEffect(() => {
    const offStart = window.events.onAgentTurnStart(() => {
      setStatus('thinking');
      setError(null);
      // Crear placeholder del assistant en cuanto empieza el turno;
      // los deltas posteriores van a este id.
      const id = nextId();
      currentAssistantId.current = id;
      pendingDelta.current = '';
      const placeholder: ChatMessage = {
        id,
        role: 'assistant',
        text: '',
        createdAt: Date.now(),
      };
      setMessages((prev) => [...prev, placeholder]);
    });

    const offDelta = window.events.onAgentDelta(({ text }) => {
      setStatus('streaming');
      pendingDelta.current += text;
      if (flushRaf.current) return;
      flushRaf.current = requestAnimationFrame(flushDeltas);
    });

    // Texto completo del turno: lo usamos para corregir el placeholder
    // por si algún delta se perdió. Sobrescribe el text del placeholder
    // (idempotente).
    const offFinal = window.events.onAgentFinal(({ text }) => {
      // Vaciar deltas pendientes antes de overwrite
      if (flushRaf.current) {
        cancelAnimationFrame(flushRaf.current);
        flushRaf.current = 0;
      }
      pendingDelta.current = '';
      const id = currentAssistantId.current;
      if (!id) return;
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, text } : m)),
      );
    });

    const offEnd = window.events.onAgentTurnEnd(() => {
      currentAssistantId.current = null;
      pendingDelta.current = '';
      setStatus('idle');
    });

    const offCancelled = window.events.onAgentTurnCancelled(() => {
      currentAssistantId.current = null;
      pendingDelta.current = '';
      setStatus('idle');
    });

    const offError = window.events.onAgentError(({ message }) => {
      currentAssistantId.current = null;
      pendingDelta.current = '';
      setStatus('idle');
      setError(message);
    });

    return () => {
      offStart();
      offDelta();
      offFinal();
      offEnd();
      offCancelled();
      offError();
      if (flushRaf.current) cancelAnimationFrame(flushRaf.current);
    };
  }, [flushDeltas]);

  const send = useCallback(
    async (text: string, shots: ScreenshotEvent[]) => {
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
        screenshots: shots.map((s) => ({
          path: s.path,
          width: s.width,
          height: s.height,
        })),
      };

      try {
        await window.api.sendTurn(payload);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        setStatus('idle');
      }
    },
    [status],
  );

  const cancel = useCallback(async () => {
    await window.api.cancelTurn();
  }, []);

  const reset = useCallback(async () => {
    await window.api.resetSession();
    setMessages([]);
    setError(null);
    setStatus('idle');
    currentAssistantId.current = null;
    pendingDelta.current = '';
  }, []);

  return { messages, status, error, send, cancel, reset };
}
