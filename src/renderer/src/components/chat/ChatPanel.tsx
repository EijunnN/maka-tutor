import { useEffect, useState } from 'react';

export function ChatPanel() {
  const [pong, setPong] = useState<string>('...');

  useEffect(() => {
    setPong(window.api.ping());
  }, []);

  return (
    <div className="pointer-events-auto fixed bottom-6 right-6 z-20 flex h-[520px] w-[400px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/70 shadow-[0_20px_60px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
      <header className="flex items-center justify-between border-b border-white/5 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
          <h2 className="text-sm font-semibold text-zinc-100">aprende-mierda</h2>
          <span className="rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-zinc-400">
            Fase 1
          </span>
        </div>
        <button
          type="button"
          onClick={() => window.api.quit()}
          className="rounded-md p-1 text-zinc-500 transition-colors hover:bg-white/5 hover:text-zinc-200"
          aria-label="Cerrar"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-sm text-zinc-400">
          <p className="font-medium text-zinc-300">Hola.</p>
          <p className="mt-1 leading-relaxed">
            Soy tu tutor. Cuando tengas algo en pantalla que no entiendas, presiona{' '}
            <kbd className="rounded bg-white/10 px-1.5 py-0.5 text-[11px] font-mono text-zinc-200">
              Ctrl+Shift+Space
            </kbd>{' '}
            y dime qué quieres hacer.
          </p>
          <p className="mt-2 text-[11px] text-zinc-500">
            (La hotkey y la captura llegan en Fase 2/3)
          </p>
        </div>
      </div>

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
          IPC bridge: <span className="font-mono text-emerald-400/80">{pong}</span>
        </p>
      </div>
    </div>
  );
}
