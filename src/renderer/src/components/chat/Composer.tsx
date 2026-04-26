import { useEffect, useRef, useState } from 'react';
import { Send, Square } from 'lucide-react';
import type { AgentStatus } from '../../hooks/useAgent';

interface Props {
  status: AgentStatus;
  hasShots: boolean;
  onSend: (text: string) => void;
  onCancel: () => void;
}

export function Composer({ status, hasShots, onSend, onCancel }: Props) {
  const [text, setText] = useState('');
  const taRef = useRef<HTMLTextAreaElement>(null);

  const busy = status !== 'idle';
  const canSend = !busy && (text.trim().length > 0 || hasShots);

  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = '0px';
    ta.style.height = `${Math.min(ta.scrollHeight, 140)}px`;
  }, [text]);

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!canSend) return;
      onSend(text);
      setText('');
    }
  };

  const handleSend = () => {
    if (busy) {
      onCancel();
      return;
    }
    if (!canSend) return;
    onSend(text);
    setText('');
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] transition-colors duration-200 focus-within:border-violet-400/40 focus-within:bg-white/[0.04]">
      <div className="px-4 pt-3.5">
        <textarea
          ref={taRef}
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKey}
          placeholder={
            hasShots
              ? 'Pregunta sobre lo que capturaste…'
              : 'Pregúntame sobre lo que tienes en pantalla…'
          }
          className="w-full resize-none bg-transparent text-sm leading-relaxed text-zinc-100 placeholder:text-zinc-600 outline-none"
          style={{ maxHeight: 140 }}
        />
      </div>
      <div className="flex items-center justify-between px-3 pb-2.5 pt-3">
        <kbd className="flex items-center gap-1 font-mono text-[10px] tracking-tight text-zinc-500">
          <span className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5">Ctrl</span>
          <span className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5">⇧</span>
          <span className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5">Space</span>
        </kbd>
        <button
          type="button"
          onClick={handleSend}
          disabled={!busy && !canSend}
          aria-label={busy ? 'Detener' : 'Enviar mensaje'}
          className={`flex size-8 items-center justify-center rounded-full transition-all duration-150 disabled:cursor-not-allowed ${
            busy
              ? 'bg-rose-500/90 text-white hover:bg-rose-400'
              : canSend
                ? 'bg-violet-500 text-white hover:bg-violet-400 hover:shadow-[0_0_20px_-2px_rgba(139,92,246,0.5)]'
                : 'bg-white/5 text-zinc-600'
          }`}
        >
          {busy ? <Square size={12} strokeWidth={2.5} fill="currentColor" /> : <Send size={14} strokeWidth={2} />}
        </button>
      </div>
    </div>
  );
}
