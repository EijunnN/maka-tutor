import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Send, Square } from 'lucide-react';
import type { AgentStatus } from '../../hooks/useChat';

interface ComposerProps {
  status: AgentStatus;
  onSend: (text: string) => void;
  onCancel: () => void;
  shotsCount: number;
  hasMessages: boolean;
}

const MAX_HEIGHT = 160;

export function Composer({ status, onSend, onCancel, shotsCount, hasMessages }: ComposerProps) {
  const [value, setValue] = useState('');
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const isBusy = status === 'thinking' || status === 'streaming';
  const canSend = !isBusy && value.trim().length > 0;

  useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`;
  }, [value]);

  const submit = () => {
    if (!canSend) return;
    onSend(value.trim());
    setValue('');
    requestAnimationFrame(() => {
      const el = taRef.current;
      if (el) el.style.height = 'auto';
    });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  let hint: React.ReactNode;
  if (isBusy) {
    hint = <span className="animate-pulse text-violet-300/70">Pensando…</span>;
  } else if (shotsCount > 0) {
    hint = (
      <span className="text-zinc-400">
        {shotsCount} captura{shotsCount === 1 ? '' : 's'} adjunta
        {shotsCount === 1 ? '' : 's'}
      </span>
    );
  } else if (hasMessages) {
    hint = (
      <span className="text-zinc-500">
        <kbd className="text-zinc-400">⏎</kbd> enviar ·{' '}
        <kbd className="text-zinc-400">⇧⏎</kbd> nueva línea
      </span>
    );
  } else {
    hint = (
      <span className="text-zinc-500">
        <kbd className="text-zinc-400">Ctrl⇧Space</kbd> capturar pantalla
      </span>
    );
  }

  return (
    <div className="px-5 pb-3 pt-4">
      <div className="flex items-end gap-2 rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-2.5 transition-colors duration-150 focus-within:border-violet-400/40 focus-within:bg-white/[0.035]">
        <textarea
          ref={taRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          placeholder={isBusy ? 'Esperando respuesta…' : 'Pregunta lo que quieras…'}
          className="scrollbar-hidden min-h-6 max-h-[160px] flex-1 resize-none bg-transparent text-base leading-relaxed text-zinc-100 outline-none placeholder:text-zinc-600"
          aria-label="Mensaje"
        />

        <button
          type="button"
          onClick={isBusy ? onCancel : submit}
          disabled={!isBusy && !canSend}
          className={`flex size-9 shrink-0 items-center justify-center rounded-full transition-all duration-150 ${
            isBusy
              ? 'bg-rose-500/90 text-white shadow-[0_0_0_1px_rgba(244,63,94,0.4)] hover:bg-rose-500'
              : canSend
                ? 'bg-violet-500 text-white shadow-[0_0_0_1px_rgba(167,139,250,0.4)] hover:bg-violet-400'
                : 'bg-white/[0.05] text-zinc-600'
          }`}
          aria-label={isBusy ? 'Cancelar' : 'Enviar'}
        >
          {isBusy ? <Square size={13} strokeWidth={2.4} fill="currentColor" /> : <Send size={14} strokeWidth={2.2} />}
        </button>
      </div>

      <div className="mt-1.5 flex items-center justify-between px-1 text-[11px]">
        <div>{hint}</div>
      </div>
    </div>
  );
}
