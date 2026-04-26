import { forwardRef } from 'react';
import { X, Minus, Sparkles, Camera, ScanLine, Send } from 'lucide-react';
import type { ScreenshotEvent } from '@shared/types';
import { ScreenshotPreview } from './ScreenshotPreview';

interface ChatPanelProps {
  interactive: boolean;
  shots: ScreenshotEvent[];
  onRemoveShot: (path: string) => void;
  error: string | null;
  onMinimize: () => void;
  onClose: () => void;
}

export const ChatPanel = forwardRef<HTMLDivElement, ChatPanelProps>(
  ({ interactive, shots, onRemoveShot, error, onMinimize, onClose }, ref) => {
    const borderClass = interactive ? 'border-violet-400/25' : 'border-white/10';
    const shadowClass = interactive
      ? 'shadow-[0_24px_70px_rgba(0,0,0,0.7),0_0_0_1px_rgba(139,92,246,0.08),0_8px_40px_-8px_rgba(139,92,246,0.25)]'
      : 'shadow-[0_24px_70px_rgba(0,0,0,0.7)]';

    return (
      <div
        ref={ref}
        className={`animate-panel-enter pointer-events-auto fixed bottom-6 right-6 z-20 flex h-[580px] w-[440px] flex-col overflow-hidden rounded-3xl border ${borderClass} bg-neutral-950/95 backdrop-blur-xl backdrop-saturate-150 transition-[border-color,box-shadow] duration-300 ${shadowClass}`}
      >
        <header className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
          <span className="text-sm font-medium tracking-tight text-zinc-100">aprende</span>
          <div className="flex items-center gap-0.5">
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

        <div className="flex flex-1 flex-col items-center justify-center px-8">
          <div className="relative mb-5 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/20 to-blue-500/10 ring-1 ring-inset ring-white/10">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-400/10 to-transparent blur-xl" />
            <Sparkles size={20} strokeWidth={2} className="relative text-violet-300" />
          </div>
          <h2 className="text-base font-medium tracking-tight text-zinc-100">Listo para enseñarte</h2>
          <p className="mt-1.5 text-center text-xs leading-relaxed text-zinc-500">
            Captura tu pantalla y dime qué quieres aprender
          </p>

          <div className="mt-6 flex w-full max-w-[300px] flex-col gap-1.5">
            <button
              type="button"
              className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-150 hover:bg-white/5 focus:outline-none focus-visible:ring-1 focus-visible:ring-violet-400/50"
            >
              <Camera size={14} strokeWidth={2} className="text-zinc-400 transition-colors group-hover:text-zinc-200" />
              <span className="flex-1 text-xs text-zinc-300">Capturar pantalla completa</span>
              <kbd className="flex items-center gap-1 font-mono text-[10px] tracking-tight text-zinc-500">
                <span className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5">Ctrl</span>
                <span className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5">⇧</span>
                <span className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5">Space</span>
              </kbd>
            </button>
            <button
              type="button"
              className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-150 hover:bg-white/5 focus:outline-none focus-visible:ring-1 focus-visible:ring-violet-400/50"
            >
              <ScanLine size={14} strokeWidth={2} className="text-zinc-400 transition-colors group-hover:text-zinc-200" />
              <span className="flex-1 text-xs text-zinc-300">Recortar área</span>
              <kbd className="flex items-center gap-1 font-mono text-[10px] tracking-tight text-zinc-500">
                <span className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5">Ctrl</span>
                <span className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5">⇧</span>
                <span className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5">A</span>
              </kbd>
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2 px-4 pb-4 pt-2">
          {error && (
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
              {error}
            </div>
          )}

          {shots.length > 0 && <ScreenshotPreview shots={shots} onRemove={onRemoveShot} />}

          <div className="rounded-2xl border border-white/10 bg-white/[0.02] transition-colors duration-200 focus-within:border-violet-400/40 focus-within:bg-white/[0.04]">
            <div className="px-4 pt-3.5">
              <input
                type="text"
                disabled
                placeholder="Pregúntame sobre lo que tienes en pantalla…"
                className="w-full bg-transparent text-sm text-zinc-100 placeholder:text-zinc-600 outline-none disabled:cursor-not-allowed"
              />
            </div>
            <div className="flex items-center justify-between px-3 pb-2.5 pt-3">
              <kbd className="flex items-center gap-1 font-mono text-[10px] tracking-tight text-zinc-500">
                <span className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5">⌘</span>
                <span className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5">⇧</span>
                <span className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5">Space</span>
              </kbd>
              <button
                type="button"
                disabled
                aria-label="Enviar mensaje"
                className="flex size-8 items-center justify-center rounded-full bg-white/5 text-zinc-600 transition-all duration-150 disabled:cursor-not-allowed enabled:bg-violet-500 enabled:text-white enabled:hover:bg-violet-400 enabled:hover:shadow-[0_0_20px_-2px_rgba(139,92,246,0.5)]"
              >
                <Send size={14} strokeWidth={2} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  },
);

ChatPanel.displayName = 'ChatPanel';
