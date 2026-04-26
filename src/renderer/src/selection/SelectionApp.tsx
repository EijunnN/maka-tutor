import { useEffect, useState } from 'react';

interface Point {
  x: number;
  y: number;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const MIN_SIZE = 4;

export function SelectionApp() {
  const params = new URLSearchParams(window.location.search);
  const sourceUrl = params.get('source') ?? '';
  const displayId = Number(params.get('displayId') ?? '0');

  const [start, setStart] = useState<Point | null>(null);
  const [end, setEnd] = useState<Point | null>(null);

  const rect: Rect | null =
    start && end
      ? {
          x: Math.min(start.x, end.x),
          y: Math.min(start.y, end.y),
          width: Math.abs(end.x - start.x),
          height: Math.abs(end.y - start.y),
        }
      : null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        window.ipc.invoke('selection:cancel').catch(() => {});
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    setStart({ x: e.clientX, y: e.clientY });
    setEnd({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!start) return;
    setEnd({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    if (rect && rect.width >= MIN_SIZE && rect.height >= MIN_SIZE) {
      window.ipc.invoke('selection:done', { rect, displayId }).catch(() => {});
    } else {
      window.ipc.invoke('selection:cancel').catch(() => {});
    }
  };

  const labelPosition = rect
    ? {
        left: Math.min(rect.x, window.innerWidth - 110),
        top: rect.y > 30 ? rect.y - 26 : rect.y + rect.height + 6,
      }
    : { left: 0, top: 0 };

  return (
    <div
      className="fixed inset-0 cursor-crosshair select-none overflow-hidden"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      style={{ pointerEvents: 'auto' }}
    >
      {sourceUrl && (
        <img
          src={sourceUrl}
          alt=""
          className="pointer-events-none absolute inset-0 h-full w-full"
          draggable={false}
          style={{ objectFit: 'fill' }}
        />
      )}

      <svg className="pointer-events-none absolute inset-0 h-full w-full">
        <defs>
          <mask id="selection-hole">
            <rect width="100%" height="100%" fill="white" />
            {rect && (
              <rect
                x={rect.x}
                y={rect.y}
                width={rect.width}
                height={rect.height}
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(0,0,0,0.55)" mask="url(#selection-hole)" />
        {rect && (
          <rect
            x={rect.x}
            y={rect.y}
            width={rect.width}
            height={rect.height}
            fill="none"
            stroke="rgb(167, 139, 250)"
            strokeWidth={1.5}
          />
        )}
      </svg>

      {rect && (
        <div
          className="pointer-events-none absolute rounded-md bg-black/85 px-2 py-1 font-mono text-[11px] text-white shadow-lg"
          style={labelPosition}
        >
          {Math.round(rect.width)} × {Math.round(rect.height)}
        </div>
      )}

      {!start && (
        <div className="pointer-events-none absolute inset-x-0 top-8 flex justify-center">
          <div className="rounded-full border border-white/15 bg-black/85 px-5 py-2 text-sm text-white shadow-2xl backdrop-blur">
            Arrastra para seleccionar el área &nbsp;·&nbsp;
            <kbd className="rounded bg-white/15 px-1.5 py-0.5 font-mono text-[11px]">Esc</kbd>{' '}
            para cancelar
          </div>
        </div>
      )}
    </div>
  );
}
