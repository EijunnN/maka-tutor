import { X } from 'lucide-react';
import type { ScreenshotEvent } from '@shared/types';

interface ScreenshotPreviewProps {
  shots: ScreenshotEvent[];
  onRemove: (path: string) => void;
}

export function ScreenshotPreview({ shots, onRemove }: ScreenshotPreviewProps) {
  return (
    <div
      className="flex gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden"
      style={{ scrollbarWidth: 'none' }}
    >
      {shots.map((shot) => {
        const label = shot.mode === 'full' ? 'Pantalla' : 'Recorte';
        return (
          <div
            key={shot.path}
            className="group flex shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-1.5 pr-3 transition-colors duration-150 hover:bg-white/[0.06]"
          >
            <img
              src={shot.url}
              alt={label}
              width={40}
              height={40}
              className="size-10 shrink-0 rounded-lg bg-black/40 object-cover"
            />
            <div className="flex min-w-0 flex-col leading-tight">
              <span className="text-xs text-zinc-200">{label}</span>
              <span className="font-mono text-[10px] text-zinc-500">
                {shot.width}×{shot.height}
              </span>
            </div>
            <button
              type="button"
              onClick={() => onRemove(shot.path)}
              aria-label="Quitar captura"
              className="ml-1 text-zinc-500 opacity-60 transition-all duration-150 hover:text-rose-400 group-hover:opacity-100 focus:outline-none focus-visible:opacity-100"
            >
              <X size={12} strokeWidth={2} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
