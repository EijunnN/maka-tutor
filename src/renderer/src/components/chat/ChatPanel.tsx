import { forwardRef } from 'react';
import { X, Minus, Sparkles, Camera, ScanLine, RotateCcw, Settings } from 'lucide-react';
import type { ScreenshotEvent } from '@shared/types';
import type { AgentStatus, ChatMessage } from '../../hooks/useAgent';
import { ScreenshotPreview } from './ScreenshotPreview';
import { MessageList } from './MessageList';
import { Composer } from './Composer';
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
  onReset: () => void;
  onMinimize: () => void;
  onClose: () => void;
  onOpenSettings: () => void;
  settingsOpen: boolean;
  onCloseSettings: () => void;
}

export const ChatPanel = forwardRef<HTMLDivElement, ChatPanelProps>(
  (
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
      onReset,
      onMinimize,
      onClose,
      onOpenSettings,
      settingsOpen,
      onCloseSettings,
    },
    ref,
  ) => {
    const borderClass = interactive ? 'border-violet-400/25' : 'border-white/10';
    const shadowClass = interactive
      ? 'shadow-[0_24px_70px_rgba(0,0,0,0.7),0_0_0_1px_rgba(139,92,246,0.08),0_8px_40px_-8px_rgba(139,92,246,0.25)]'
      : 'shadow-[0_24px_70px_rgba(0,0,0,0.7)]';

    const hasMessages = messages.length > 0;
    const error = agentError ?? shotsError;

    return (
      <div
        ref={ref}
        className={`animate-panel-enter pointer-events-auto fixed bottom-6 right-6 z-20 flex h-[580px] w-[440px] flex-col overflow-hidden rounded-3xl border ${borderClass} bg-neutral-950/95 backdrop-blur-xl backdrop-saturate-150 transition-[border-color,box-shadow] duration-300 ${shadowClass}`}
      >
        <header className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
          <span className="text-sm font-medium tracking-tight text-zinc-100">aprende</span>
          <div className="flex items-center gap-0.5">
            {hasMessages && (
              <button
                type="button"
                onClick={onReset}
                aria-label="Nueva conversación"
                title="Nueva conversación"
                className="rounded-lg p-1.5 text-zinc-500 transition-colors duration-150 hover:bg-white/5 hover:text-zinc-200 focus:outline-none focus-visible:ring-1 focus-visible:ring-violet-400/50"
              >
                <RotateCcw size={14} strokeWidth={2} />
              </button>
            )}
            <button
              type="button"
              onClick={onOpenSettings}
              aria-label="Ajustes"
              title="Ajustes"
              className="rounded-lg p-1.5 text-zinc-500 transition-colors duration-150 hover:bg-white/5 hover:text-zinc-200 focus:outline-none focus-visible:ring-1 focus-visible:ring-violet-400/50"
            >
              <Settings size={14} strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={onMinimize}
              aria-label="Minimizar"
              className="rounded-lg p-1.5 text-zinc-500 transition-colors duration-150 hover:bg-white/5 hover:text-zinc-200 focus:outline-none focus-visible:ring-1 focus-visible:ring-violet-400/50"
            >
              <Minus size={14} strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="rounded-lg p-1.5 text-zinc-500 transition-colors duration-150 hover:bg-white/5 hover:text-zinc-200 focus:outline-none focus-visible:ring-1 focus-visible:ring-violet-400/50"
            >
              <X size={14} strokeWidth={2} />
            </button>
          </div>
        </header>

        {hasMessages ? (
          <MessageList messages={messages} status={status} />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center px-8">
            <div className="relative mb-5 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/20 to-blue-500/10 ring-1 ring-inset ring-white/10">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-400/10 to-transparent blur-xl" />
              <Sparkles size={20} strokeWidth={2} className="relative text-violet-300" />
            </div>
            <h2 className="text-base font-medium tracking-tight text-zinc-100">
              Listo para enseñarte
            </h2>
            <p className="mt-1.5 text-center text-xs leading-relaxed text-zinc-500">
              Captura tu pantalla y dime qué quieres aprender
            </p>

            <div className="mt-6 flex w-full max-w-[300px] flex-col gap-1.5">
              <div className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-150 hover:bg-white/5">
                <Camera size={14} strokeWidth={2} className="text-zinc-400" />
                <span className="flex-1 text-xs text-zinc-300">Capturar pantalla completa</span>
                <kbd className="flex items-center gap-1 font-mono text-[10px] tracking-tight text-zinc-500">
                  <span className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5">Ctrl</span>
                  <span className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5">⇧</span>
                  <span className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5">Space</span>
                </kbd>
              </div>
              <div className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-150 hover:bg-white/5">
                <ScanLine size={14} strokeWidth={2} className="text-zinc-400" />
                <span className="flex-1 text-xs text-zinc-300">Recortar área</span>
                <kbd className="flex items-center gap-1 font-mono text-[10px] tracking-tight text-zinc-500">
                  <span className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5">Ctrl</span>
                  <span className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5">⇧</span>
                  <span className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5">A</span>
                </kbd>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2 px-4 pb-4 pt-2">
          {error && (
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
              {error}
            </div>
          )}

          {shots.length > 0 && <ScreenshotPreview shots={shots} onRemove={onRemoveShot} />}

          <Composer
            status={status}
            hasShots={shots.length > 0}
            onSend={onSend}
            onCancel={onCancel}
          />
        </div>

        <SettingsDialog open={settingsOpen} onClose={onCloseSettings} />
      </div>
    );
  },
);

ChatPanel.displayName = 'ChatPanel';
