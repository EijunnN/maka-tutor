import { forwardRef } from 'react';
import type { ScreenshotEvent } from '@shared/types';
import { ScreenshotPreview } from './ScreenshotPreview';

interface ChatPanelProps {
  interactive: boolean;
  shots: ScreenshotEvent[];
  onRemoveShot: (path: string) => void;
  error: string | null;
}

export const ChatPanel = forwardRef<HTMLDivElement, ChatPanelProps>(function ChatPanel(
  { interactive, shots, onRemoveShot, error },
  ref,
) {
  return (
    <div
      ref={ref}
      className={`pointer-events-auto fixed bottom-6 right-6 z-20 flex h-[560px] w-[420px] flex-col overflow-hidden rounded-2xl border bg-neutral-950/95 shadow-[0_24px_70px_rgba(0,0,0,0.75)] backdrop-blur-md transition-[border-color,box-shadow] duration-200 ${
        interactive
          ? 'border-violet-400/40 shadow-[0_24px_70px_rgba(139,92,246,0.3)]'
          : 'border-white/15'
      }`}
    >
      <header className="flex items-center justify-between border-b border-white/5 px-4 py-3">
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full transition-colors ${
              interactive
                ? 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]'
                : 'bg-zinc-600'
            }`}
            title={interactive ? 'Interactivo' : 'Click-through'}
          />
          <h2 className="text-sm font-semibold text-zinc-100">aprende-mierda</h2>
          <span className="rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-zinc-400">
            Fase 3
          </span>
        </div>
        <button
          type="button"
          onClick={() => window.api.quit()}
          className="rounded-md p-1 text-zinc-500 transition-colors hover:bg-white/5 hover:text-zinc-200"
          aria-label="Cerrar"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-sm text-zinc-400">
          <p className="font-medium text-zinc-300">Hola.</p>
          <p className="mt-1 leading-relaxed">
            Soy tu tutor. Captura lo que ves y mándame lo que quieres aprender.
          </p>
          <div className="mt-2 space-y-1 text-[11px] text-zinc-500">
            <p>
              <kbd className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-zinc-200">
                Ctrl+Shift+Space
              </kbd>{' '}
              — captura el monitor donde tienes el cursor.
            </p>
            <p>
              <kbd className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-zinc-200">
                Ctrl+Shift+A
              </kbd>{' '}
              — selecciona un área de la pantalla (estilo recortes).
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
            {error}
          </div>
        )}
      </div>

      <ScreenshotPreview shots={shots} onRemove={onRemoveShot} />

      <div className="border-t border-white/5 p-3">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 transition-colors focus-within:border-violet-400/40 focus-within:bg-white/[0.05]">
          <input
            type="text"
            placeholder="Enséñame Power BI, quiero cargar un CSV..."
            className="w-full bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-600"
            disabled
          />
        </div>
        <p className="mt-2 text-[10px] text-zinc-600">
          {shots.length > 0
            ? `${shots.length} captura${shots.length === 1 ? '' : 's'} adjunta${shots.length === 1 ? '' : 's'}`
            : 'Sin adjuntos. Pulsa la hotkey para capturar.'}
        </p>
      </div>
    </div>
  );
});
