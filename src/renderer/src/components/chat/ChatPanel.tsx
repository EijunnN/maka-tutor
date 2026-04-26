import { forwardRef, useEffect, useRef, useState } from 'react';
import {
  X,
  Minus,
  Settings,
  Sparkles,
  Camera,
  ScanLine,
  MessageSquare,
  ChevronDown,
  Trash2,
  Plus,
  Eye,
  ArrowRight,
  Repeat,
  Dumbbell,
} from 'lucide-react';
import type { ConversationMeta, Nudge, ScreenshotEvent } from '@shared/types';
import type { AgentStatus, ChatMessage } from '../../hooks/useChat';
import { MessageList } from './MessageList';
import { Composer } from './Composer';
import { ScreenshotPreview } from './ScreenshotPreview';
import { SettingsDialog } from '../settings/SettingsDialog';

interface ChatPanelProps {
  interactive: boolean;
  shots: ScreenshotEvent[];
  onRemoveShot: (path: string) => void;
  shotsError: string | null;
  agentError: string | null;

  messages: ChatMessage[];
  status: AgentStatus;
  onSend: (text: string) => void;
  onCancel: () => void;

  conversations: ConversationMeta[];
  activeId: string;
  onNewChat: () => void;
  onOpenChat: (id: string) => void;
  onDeleteChat: (id: string) => void;

  nudges: Nudge[];
  onNudge: (nudge: Nudge) => void;

  onMinimize: () => void;
  onClose: () => void;
  onOpenSettings: () => void;
  settingsOpen: boolean;
  onCloseSettings: () => void;
}

function timeAgo(ts: number): string {
  const diffMs = Date.now() - ts;
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return 'ahora';
  const min = Math.floor(sec / 60);
  if (min < 60) return `hace ${min}min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `hace ${hr}h`;
  const day = Math.floor(hr / 24);
  if (day === 1) return 'ayer';
  if (day < 7) return `hace ${day}d`;
  const d = new Date(ts);
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

export const ChatPanel = forwardRef<HTMLDivElement, ChatPanelProps>(function ChatPanel(
  {
    interactive,
    shots,
    onRemoveShot,
    shotsError,
    agentError,
    messages,
    status,
    onSend,
    onCancel,
    conversations,
    activeId,
    onNewChat,
    onOpenChat,
    onDeleteChat,
    nudges,
    onNudge,
    onMinimize,
    onClose,
    onOpenSettings,
    settingsOpen,
    onCloseSettings,
  },
  ref,
) {
  const [convOpen, setConvOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const activeConv = conversations.find((c) => c.id === activeId);
  const activeTitle = activeConv?.title?.trim() || 'Nueva conversación';
  const isBusy = status === 'thinking' || status === 'streaming';

  useEffect(() => {
    if (!convOpen) return;
    function onDocMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      if (
        popoverRef.current &&
        !popoverRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        setConvOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setConvOpen(false);
    }
    document.addEventListener('mousedown', onDocMouseDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [convOpen]);

  const handlePickConv = (id: string) => {
    onOpenChat(id);
    setConvOpen(false);
  };

  const handleNew = () => {
    onNewChat();
    setConvOpen(false);
  };

  return (
    <div
      ref={ref}
      className={`glass-panel ${interactive ? 'glass-panel-interactive' : ''} pointer-events-auto animate-panel-enter fixed bottom-6 right-6 z-20 flex h-[760px] w-[560px] flex-col overflow-hidden rounded-2xl transition-[border-color,box-shadow] duration-300`}
    >
      <header className="relative flex items-center justify-between gap-2 border-b border-white/[0.05] bg-white/[0.025] px-3 py-2.5 backdrop-blur-md">
        <div className="relative min-w-0 flex-1">
          <button
            ref={triggerRef}
            type="button"
            onClick={() => setConvOpen((v) => !v)}
            className={`group flex max-w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-zinc-200 transition-colors duration-150 hover:bg-white/[0.04] active:bg-white/[0.06] ${
              convOpen ? 'bg-white/[0.04]' : ''
            }`}
            aria-haspopup="listbox"
            aria-expanded={convOpen}
          >
            <MessageSquare size={13} className="shrink-0 text-zinc-500" strokeWidth={2} />
            <span className="min-w-0 truncate text-[13px] font-medium">{activeTitle}</span>
            <ChevronDown
              size={13}
              strokeWidth={2.2}
              className={`shrink-0 text-zinc-500 transition-transform duration-200 ${
                convOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {convOpen && (
            <div
              ref={popoverRef}
              className="glass-popover animate-popover-enter absolute left-0 top-full z-30 mt-1.5 flex max-h-[340px] w-[340px] origin-top-left flex-col overflow-hidden rounded-xl"
              role="listbox"
            >
              <button
                type="button"
                onClick={handleNew}
                className="flex items-center gap-2.5 border-b border-white/[0.05] px-3 py-2.5 text-[13px] font-medium text-zinc-100 transition-colors duration-150 hover:bg-violet-400/[0.08] active:bg-violet-400/[0.12]"
              >
                <span className="flex size-5 items-center justify-center rounded-md bg-violet-400/15 text-violet-300">
                  <Plus size={13} strokeWidth={2.4} />
                </span>
                Nueva conversación
              </button>

              <div className="scrollbar-hidden flex-1 overflow-y-auto py-1">
                {conversations.length === 0 ? (
                  <div className="px-3 py-8 text-center text-[12px] text-zinc-500">
                    Aún no hay conversaciones
                  </div>
                ) : (
                  conversations.map((c) => {
                    const isActive = c.id === activeId;
                    const title = c.title?.trim() || 'Sin título';
                    return (
                      <div
                        key={c.id}
                        role="option"
                        aria-selected={isActive}
                        className={`group relative mx-1 my-0.5 flex cursor-pointer select-none items-center gap-2 rounded-lg py-2 pl-3 pr-1.5 transition-colors duration-150 ${
                          isActive ? 'bg-white/[0.05]' : 'hover:bg-white/[0.03]'
                        }`}
                        onClick={() => handlePickConv(c.id)}
                      >
                        {isActive && (
                          <span className="absolute bottom-1.5 left-0 top-1.5 w-[2px] rounded-r bg-violet-400" />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13px] leading-tight text-zinc-100">
                            {title}
                          </div>
                          <div className="mt-0.5 truncate text-[11px] text-zinc-500">
                            {c.messageCount} {c.messageCount === 1 ? 'mensaje' : 'mensajes'} ·{' '}
                            {timeAgo(c.updatedAt)}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteChat(c.id);
                          }}
                          className="flex size-7 shrink-0 items-center justify-center rounded-md text-zinc-500 opacity-0 transition-all duration-150 hover:bg-white/[0.05] hover:text-rose-300 focus:opacity-100 group-hover:opacity-100"
                          aria-label="Eliminar conversación"
                        >
                          <Trash2 size={12} strokeWidth={2} />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={onOpenSettings}
            className="flex size-7 items-center justify-center rounded-md text-zinc-500 transition-colors duration-150 hover:bg-white/[0.05] hover:text-zinc-200"
            aria-label="Ajustes"
          >
            <Settings size={14} strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={onMinimize}
            className="flex size-7 items-center justify-center rounded-md text-zinc-500 transition-colors duration-150 hover:bg-white/[0.05] hover:text-zinc-200"
            aria-label="Minimizar"
          >
            <Minus size={14} strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex size-7 items-center justify-center rounded-md text-zinc-500 transition-colors duration-150 hover:bg-white/[0.05] hover:text-rose-300"
            aria-label="Cerrar"
          >
            <X size={14} strokeWidth={2} />
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col">
        {messages.length === 0 ? (
          <EmptyState nudges={nudges} onNudge={onNudge} />
        ) : (
          <div className="min-h-0 flex-1 overflow-hidden px-5 py-5">
            <MessageList messages={messages} status={status} />
          </div>
        )}
      </div>

      <div className="glass-section">
        {agentError && (
          <div className="mx-5 mt-3 rounded-lg border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-[12px] text-rose-200">
            {agentError}
          </div>
        )}
        {shotsError && (
          <div className="mx-5 mt-3 rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-[12px] text-amber-200">
            {shotsError}
          </div>
        )}
        {shots.length > 0 && (
          <div className="px-5 pt-3">
            <ScreenshotPreview shots={shots} onRemove={onRemoveShot} />
          </div>
        )}

        <Composer
          status={status}
          onSend={onSend}
          onCancel={onCancel}
          shotsCount={shots.length}
          hasMessages={messages.length > 0}
        />

        <div className="flex items-center justify-between border-t border-white/[0.04] px-5 py-1.5 text-[11px]">
          <span className="text-zinc-600">Sonnet 4.5</span>
          <span className="text-zinc-600">
            {isBusy ? <span className="animate-pulse text-violet-300/70">Procesando…</span> : ''}
          </span>
        </div>
      </div>

      <SettingsDialog open={settingsOpen} onClose={onCloseSettings} />
    </div>
  );
});

function EmptyState({
  nudges,
  onNudge,
}: {
  nudges: Nudge[];
  onNudge: (nudge: Nudge) => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-8 py-10 text-center scrollbar-hidden">
      <div className="relative mb-5">
        <div className="absolute inset-0 rounded-full bg-violet-400/20 blur-xl" />
        <div className="relative flex size-12 items-center justify-center rounded-full border border-violet-400/20 bg-violet-400/10">
          <Sparkles size={22} className="text-violet-300" strokeWidth={1.8} />
        </div>
      </div>
      <h2 className="text-lg font-medium tracking-tight text-zinc-100">
        ¿Qué quieres aprender hoy?
      </h2>
      <p className="mt-1.5 max-w-[340px] text-sm leading-relaxed text-zinc-500">
        Captura algo de tu pantalla o escribe directamente. Yo te lo explico.
      </p>

      {nudges.length > 0 && (
        <div className="mt-7 w-full max-w-[380px]">
          <h3 className="mb-2 px-1 text-left text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-500">
            Continuar donde lo dejaste
          </h3>
          <div className="space-y-1.5">
            {nudges.map((n) => (
              <NudgeRow key={n.id} nudge={n} onClick={() => onNudge(n)} />
            ))}
          </div>
        </div>
      )}

      <div className="mt-7 w-full max-w-[380px] space-y-1.5">
        <ActionRow icon={<Camera size={16} strokeWidth={1.8} />} label="Capturar pantalla">
          <Kbd>Ctrl</Kbd>
          <Kbd>⇧</Kbd>
          <Kbd>Space</Kbd>
        </ActionRow>
        <ActionRow icon={<ScanLine size={16} strokeWidth={1.8} />} label="Recortar área">
          <Kbd>Ctrl</Kbd>
          <Kbd>⇧</Kbd>
          <Kbd>A</Kbd>
        </ActionRow>
        <ActionRow icon={<Eye size={16} strokeWidth={1.8} />} label="Mostrar / ocultar app">
          <Kbd>Ctrl</Kbd>
          <Kbd>⇧</Kbd>
          <Kbd>H</Kbd>
        </ActionRow>
        <ActionRow icon={<MessageSquare size={16} strokeWidth={1.8} />} label="Nueva conversación">
          <Kbd>Ctrl</Kbd>
          <Kbd>L</Kbd>
        </ActionRow>
      </div>
    </div>
  );
}

function NudgeRow({ nudge, onClick }: { nudge: Nudge; onClick: () => void }) {
  const meta = nudgeMeta(nudge);
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-lg border border-violet-400/15 bg-violet-400/[0.06] px-4 py-2.5 text-left transition-colors duration-150 hover:border-violet-400/30 hover:bg-violet-400/[0.1] focus:outline-none focus-visible:ring-1 focus-visible:ring-violet-400/50"
    >
      <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-violet-400/15 text-violet-200">
        {meta.icon}
      </span>
      <span className="flex-1 truncate text-left">
        <span className="block truncate text-sm text-zinc-100">{nudge.label}</span>
        <span className="block text-[10px] text-zinc-500">
          {meta.kindLabel} · hace {Math.round(nudge.age_days)}d
        </span>
      </span>
      <ArrowRight
        size={14}
        strokeWidth={2}
        className="shrink-0 text-zinc-500 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-violet-200"
      />
    </button>
  );
}

function nudgeMeta(n: Nudge): { icon: React.ReactNode; kindLabel: string } {
  switch (n.type) {
    case 'continuar':
      return { icon: <ArrowRight size={14} strokeWidth={1.8} />, kindLabel: 'Continuar' };
    case 'repasar':
      return { icon: <Repeat size={14} strokeWidth={1.8} />, kindLabel: 'Repasar' };
    case 'practicar':
      return { icon: <Dumbbell size={14} strokeWidth={1.8} />, kindLabel: 'Practicar' };
  }
}

function ActionRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-white/[0.04] bg-white/[0.02] px-4 py-3 transition-colors duration-150 hover:bg-white/[0.035]">
      <span className="flex size-7 items-center justify-center rounded-md bg-white/[0.04] text-zinc-300">
        {icon}
      </span>
      <span className="flex-1 text-left text-sm text-zinc-200">{label}</span>
      <span className="flex items-center gap-1">{children}</span>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-white/[0.08] bg-white/[0.06] px-1.5 py-0.5 text-[10.5px] font-medium text-zinc-300 shadow-[inset_0_-1px_0_rgba(255,255,255,0.04)]">
      {children}
    </kbd>
  );
}
