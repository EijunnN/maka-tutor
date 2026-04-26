import type { ScreenshotEvent } from '@shared/types';

interface Props {
  shots: ScreenshotEvent[];
  onRemove: (path: string) => void;
}

export function ScreenshotPreview({ shots, onRemove }: Props) {
  if (shots.length === 0) return null;

  return (
    <div className="flex gap-2 overflow-x-auto px-3 pt-3">
      {shots.map((shot) => (
        <div
          key={shot.path}
          className="group relative h-16 w-24 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-black/40"
          title={`${shot.width}×${shot.height} (${shot.mode})`}
        >
          <img
            src={shot.url}
            alt="screenshot"
            className="h-full w-full object-cover"
            draggable={false}
          />
          <button
            type="button"
            onClick={() => onRemove(shot.path)}
            className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white opacity-0 transition-opacity hover:bg-red-500/80 group-hover:opacity-100"
            aria-label="Quitar adjunto"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
          <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1 py-0.5 text-[8px] uppercase tracking-wider text-white/80">
            {shot.mode === 'full' ? 'Full' : 'Área'}
          </span>
        </div>
      ))}
    </div>
  );
}
