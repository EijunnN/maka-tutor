import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  Conversation,
  ConversationMeta,
  ScreenshotEvent,
  SendTurnPayload,
} from '@shared/types';

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
function nextId(prefix = 'm'): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}

function newConversationId(): string {
  return `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function deriveTitle(text: string): string {
  const t = text.trim().replace(/\s+/g, ' ');
  if (!t) return 'Nueva conversación';
  return t.length > 60 ? `${t.slice(0, 57)}…` : t;
}

const SAVE_DEBOUNCE_MS = 600;

export function useChat() {
  const [conversations, setConversations] = useState<ConversationMeta[]>([]);
  const [activeId, setActiveId] = useState<string>(() => newConversationId());
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<AgentStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  // Sesión del SDK por conversación. Se setea al guardar el primer
  // turn (system/init no nos llega aquí; lo deduce el agente).
  const sessionIdRef = useRef<string | undefined>(undefined);
  const titleRef = useRef<string>('Nueva conversación');
  const createdAtRef = useRef<number>(Date.now());

  const currentAssistantId = useRef<string | null>(null);
  // Smooth streaming: el modelo manda chunks de varias palabras de golpe,
  // pero queremos pintar char-a-char a ritmo de lectura. Mantenemos una
  // cola y un loop RAF que drena con velocidad adaptativa según backlog.
  const charBuffer = useRef('');
  const displayedLen = useRef(0);
  const flushRaf = useRef(0);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshList = useCallback(async () => {
    const list = await window.api.listConversations();
    setConversations(list);
  }, []);

  const drainChars = useCallback(() => {
    flushRaf.current = 0;
    const buffer = charBuffer.current;
    const id = currentAssistantId.current;
    if (!buffer.length || !id) return;

    // Velocidad adaptativa: ~60 chars/s en cola corta (ritmo lectura),
    // y catch-up agresivo si llegó un burst grande (modelo respondió
    // rapidísimo o se acumuló por throttling de pestaña).
    const backlog = buffer.length;
    const chunkSize =
      backlog > 400 ? Math.ceil(backlog / 8)
      : backlog > 100 ? 4
      : backlog > 30 ? 2
      : 1;

    const chunk = buffer.slice(0, chunkSize);
    charBuffer.current = buffer.slice(chunkSize);
    displayedLen.current += chunk.length;

    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, text: m.text + chunk } : m)),
    );

    if (charBuffer.current.length > 0) {
      flushRaf.current = requestAnimationFrame(drainChars);
    }
  }, []);

  // Listeners de eventos del agente
  useEffect(() => {
    const offStart = window.events.onAgentTurnStart(() => {
      setStatus('thinking');
      setError(null);
      const id = nextId();
      currentAssistantId.current = id;
      charBuffer.current = '';
      displayedLen.current = 0;
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
      charBuffer.current += text;
      if (!flushRaf.current) {
        flushRaf.current = requestAnimationFrame(drainChars);
      }
    });

    const offFinal = window.events.onAgentFinal(({ text }) => {
      const id = currentAssistantId.current;
      if (!id) return;
      // El "final" puede llegar mientras el buffer todavía se está
      // drenando. Reconciliamos: si lo mostrado + lo pendiente no
      // coincide con el final, el resto del final pasa a buffer.
      // Si el final es más corto que lo mostrado (caso raro de
      // corrección), truncamos directo.
      if (text.length >= displayedLen.current) {
        charBuffer.current = text.slice(displayedLen.current);
        if (charBuffer.current.length > 0 && !flushRaf.current) {
          flushRaf.current = requestAnimationFrame(drainChars);
        }
      } else {
        if (flushRaf.current) {
          cancelAnimationFrame(flushRaf.current);
          flushRaf.current = 0;
        }
        charBuffer.current = '';
        displayedLen.current = text.length;
        setMessages((prev) =>
          prev.map((m) => (m.id === id ? { ...m, text } : m)),
        );
      }
    });

    const offEnd = window.events.onAgentTurnEnd((evt) => {
      if (evt.sessionId) sessionIdRef.current = evt.sessionId;
      // Si quedan chars en el buffer al cerrar el turno, los volcamos
      // de una vez para no dejar la animación huérfana mientras el
      // status pasa a idle.
      if (charBuffer.current.length > 0) {
        const id = currentAssistantId.current;
        const tail = charBuffer.current;
        charBuffer.current = '';
        displayedLen.current += tail.length;
        if (id) {
          setMessages((prev) =>
            prev.map((m) => (m.id === id ? { ...m, text: m.text + tail } : m)),
          );
        }
      }
      if (flushRaf.current) {
        cancelAnimationFrame(flushRaf.current);
        flushRaf.current = 0;
      }
      currentAssistantId.current = null;
      setStatus('idle');
    });

    const offCancelled = window.events.onAgentTurnCancelled(() => {
      if (flushRaf.current) {
        cancelAnimationFrame(flushRaf.current);
        flushRaf.current = 0;
      }
      currentAssistantId.current = null;
      charBuffer.current = '';
      displayedLen.current = 0;
      setStatus('idle');
    });

    const offError = window.events.onAgentError(({ message }) => {
      if (flushRaf.current) {
        cancelAnimationFrame(flushRaf.current);
        flushRaf.current = 0;
      }
      currentAssistantId.current = null;
      charBuffer.current = '';
      displayedLen.current = 0;
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
  }, [drainChars]);

  // Cargar lista al montar
  useEffect(() => {
    void refreshList();
  }, [refreshList]);

  // Auto-save: cada vez que messages cambia (y hay al menos un user
  // message), guardamos la conversación. Debounce para no escribir
  // a cada delta de streaming.
  useEffect(() => {
    if (messages.length === 0) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveTimer.current = null;
      const conv: Conversation = {
        id: activeId,
        title: titleRef.current,
        sessionId: sessionIdRef.current,
        messages: messages.map((m) => ({
          id: m.id,
          role: m.role,
          text: m.text,
          shots: m.shots,
          createdAt: m.createdAt,
        })),
        createdAt: createdAtRef.current,
        updatedAt: Date.now(),
      };
      void window.api.saveConversation(conv).then(() => refreshList());
    }, SAVE_DEBOUNCE_MS);
    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
      }
    };
  }, [messages, activeId, refreshList]);

  const send = useCallback(
    async (text: string, shots: ScreenshotEvent[]) => {
      if (status !== 'idle') return;
      // Si es el primer mensaje, derivar título de éste
      if (messages.length === 0) {
        titleRef.current = deriveTitle(text);
        createdAtRef.current = Date.now();
      }
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
    [status, messages.length],
  );

  const cancel = useCallback(async () => {
    await window.api.cancelTurn();
  }, []);

  const newChat = useCallback(async () => {
    await window.api.cancelTurn();
    await window.api.resetSession();
    sessionIdRef.current = undefined;
    titleRef.current = 'Nueva conversación';
    createdAtRef.current = Date.now();
    currentAssistantId.current = null;
    charBuffer.current = '';
    displayedLen.current = 0;
    setMessages([]);
    setError(null);
    setStatus('idle');
    setActiveId(newConversationId());
  }, []);

  const openChat = useCallback(
    async (id: string) => {
      if (id === activeId) return;
      await window.api.cancelTurn();
      const conv = await window.api.loadConversation(id);
      if (!conv) return;
      sessionIdRef.current = conv.sessionId;
      await window.api.setActiveSession(conv.sessionId);
      titleRef.current = conv.title;
      createdAtRef.current = conv.createdAt;
      currentAssistantId.current = null;
      charBuffer.current = '';
      displayedLen.current = 0;
      setActiveId(conv.id);
      setMessages(
        conv.messages.map((m) => ({
          id: m.id,
          role: m.role,
          text: m.text,
          shots: m.shots,
          createdAt: m.createdAt,
        })),
      );
      setError(null);
      setStatus('idle');
    },
    [activeId],
  );

  const deleteChat = useCallback(
    async (id: string) => {
      await window.api.deleteConversation(id);
      if (id === activeId) {
        await newChat();
      }
      await refreshList();
    },
    [activeId, newChat, refreshList],
  );

  return {
    conversations,
    activeId,
    messages,
    status,
    error,
    send,
    cancel,
    newChat,
    openChat,
    deleteChat,
  };
}
