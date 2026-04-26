import { useEffect, useState } from 'react';
import { X, Eye, EyeOff, Check } from 'lucide-react';
import type { SettingsSnapshot } from '@shared/types';

interface Props {
  open: boolean;
  onClose: () => void;
}

const MODELS = [
  { id: 'claude-sonnet-4-5-20250929', label: 'Sonnet 4.5' },
  { id: 'claude-opus-4-7', label: 'Opus 4.7' },
  { id: 'claude-haiku-4-5-20251001', label: 'Haiku 4.5' },
];

export function SettingsDialog({ open, onClose }: Props) {
  const [snapshot, setSnapshot] = useState<SettingsSnapshot | null>(null);
  const [apiKey, setApiKeyDraft] = useState('');
  const [reveal, setReveal] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setSavedFlash(false);
    setApiKeyDraft('');
    void window.api.getSettings().then(setSnapshot);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleSaveKey = async () => {
    setError(null);
    const result = await window.api.setApiKey(apiKey.trim().length > 0 ? apiKey.trim() : null);
    if (!result.ok) {
      setError(result.message ?? 'No se pudo guardar.');
      return;
    }
    setApiKeyDraft('');
    setSavedFlash(true);
    setSnapshot(await window.api.getSettings());
    setTimeout(() => setSavedFlash(false), 1500);
  };

  const handleClearKey = async () => {
    await window.api.setApiKey(null);
    setSnapshot(await window.api.getSettings());
  };

  const handleModelChange = async (id: string) => {
    await window.api.setModel(id);
    setSnapshot(await window.api.getSettings());
  };

  return (
    <div
      className="pointer-events-auto absolute inset-0 z-30 flex items-stretch justify-stretch bg-[rgba(20,20,24,0.78)] backdrop-blur-2xl backdrop-saturate-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex w-full flex-col">
        <header className="flex items-center justify-between border-b border-white/[0.06] bg-white/[0.02] px-4 py-3">
          <span className="text-sm font-medium tracking-tight text-zinc-100">Ajustes</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar ajustes"
            className="rounded-lg p-1.5 text-zinc-500 transition-colors duration-150 hover:bg-white/5 hover:text-zinc-200 focus:outline-none focus-visible:ring-1 focus-visible:ring-violet-400/50"
          >
            <X size={14} strokeWidth={2} />
          </button>
        </header>

        <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-5 py-5">
          <section>
            <h3 className="text-xs font-medium uppercase tracking-[0.1em] text-zinc-400">
              Anthropic API key
            </h3>
            <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
              Si no configuras una, la app usará tu sesión de <code className="rounded bg-white/[0.05] px-1 py-0.5 font-mono text-[10px] text-zinc-400">claude</code> CLI si está logueado.
            </p>

            <div className="mt-3 flex items-center gap-2">
              <div className="glass-input flex flex-1 items-center rounded-xl px-3 py-2">
                <input
                  type={reveal ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKeyDraft(e.target.value)}
                  placeholder={snapshot?.hasApiKey ? '•••••••••••••• (guardada)' : 'sk-ant-...'}
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full bg-transparent font-mono text-xs text-zinc-100 outline-none placeholder:text-zinc-600"
                />
                <button
                  type="button"
                  onClick={() => setReveal((r) => !r)}
                  aria-label={reveal ? 'Ocultar' : 'Mostrar'}
                  className="ml-2 text-zinc-500 transition-colors hover:text-zinc-300"
                >
                  {reveal ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <button
                type="button"
                onClick={handleSaveKey}
                disabled={apiKey.trim().length === 0}
                className={`flex h-9 items-center gap-1.5 rounded-xl px-3.5 text-xs font-medium transition-colors ${
                  apiKey.trim().length === 0
                    ? 'cursor-not-allowed border border-white/[0.06] bg-white/[0.04] text-zinc-600'
                    : 'glass-button-violet text-white'
                }`}
              >
                {savedFlash ? <Check size={14} strokeWidth={2.5} /> : 'Guardar'}
              </button>
            </div>

            {snapshot?.hasApiKey && (
              <button
                type="button"
                onClick={handleClearKey}
                className="mt-2 text-[11px] text-zinc-500 underline-offset-2 hover:text-rose-400 hover:underline"
              >
                Eliminar API key guardada
              </button>
            )}

            {error && (
              <p className="mt-2 rounded-lg border border-rose-500/20 bg-rose-500/10 px-2.5 py-1.5 text-[11px] text-rose-300">
                {error}
              </p>
            )}
          </section>

          <section>
            <h3 className="text-xs font-medium uppercase tracking-[0.1em] text-zinc-400">Modelo</h3>
            <div className="mt-3 flex flex-col gap-1">
              {MODELS.map((m) => {
                const selected = snapshot?.model === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleModelChange(m.id)}
                    className={`group flex items-center justify-between rounded-xl border px-3 py-2.5 text-left transition-colors duration-150 ${
                      selected
                        ? 'border-violet-400/40 bg-violet-500/10'
                        : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-zinc-100">{m.label}</span>
                      <span className="font-mono text-[10px] text-zinc-500">{m.id}</span>
                    </div>
                    {selected && <Check size={14} strokeWidth={2.5} className="text-violet-300" />}
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <h3 className="text-xs font-medium uppercase tracking-[0.1em] text-zinc-400">Atajos</h3>
            <div className="mt-3 grid grid-cols-1 gap-1.5">
              <ShortcutRow label="Captura pantalla" keys={['Ctrl', '⇧', 'Space']} />
              <ShortcutRow label="Recortar área" keys={['Ctrl', '⇧', 'A']} />
              <ShortcutRow label="Mostrar/ocultar app" keys={['Ctrl', '⇧', 'H']} />
              <ShortcutRow label="Enviar mensaje" keys={['Enter']} />
              <ShortcutRow label="Salto de línea" keys={['⇧', 'Enter']} />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function ShortcutRow({ label, keys }: { label: string; keys: string[] }) {
  return (
    <div className="flex items-center justify-between rounded-lg px-2 py-1.5">
      <span className="text-xs text-zinc-300">{label}</span>
      <kbd className="flex items-center gap-1 font-mono text-[10px] tracking-tight text-zinc-500">
        {keys.map((k, i) => (
          <span key={i} className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5">
            {k}
          </span>
        ))}
      </kbd>
    </div>
  );
}
