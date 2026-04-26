import { useEffect, useRef, useState } from 'react';

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
  const rafRef = useRef(0);
  const pendingRef = useRef<Point | null>(null);

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
    return () => {
      window.removeEventListener('keydown', onKey);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    setStart({ x: e.clientX, y: e.clientY });
    setEnd({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!start) return;
    pendingRef.current = { x: e.clientX, y: e.clientY };
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      if (pendingRef.current) setEnd(pendingRef.current);
    });
  };

  const handleMouseUp = () => {
    if (rect && rect.width >= MIN_SIZE && rect.height >= MIN_SIZE) {
      window.ipc.invoke('selection:done', { rect, displayId }).catch(() => {});
    } else {
      window.ipc.invoke('selection:cancel').catch(() => {});
    }
  };

  return (
    <div
      className="fixed inset-0 cursor-crosshair select-none overflow-hidden"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
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

      {/* Capa oscura única; cuando hay rect, la sustituimos por
          un div con box-shadow inset infinita: GPU-composited, cero
          re-cálculo de SVG por frame. */}
      {rect ? (
        <div
          className="pointer-events-none absolute rounded-[1px] border border-violet-300/80"
          style={{
            left: rect.x,
            top: rect.y,
            width: rect.width,
            height: rect.height,
            boxShadow: '0 0 0 99999px rgba(0, 0, 0, 0.55)',
            willChange: 'left, top, width, height',
          }}
        />
      ) : (
        <div className="pointer-events-none absolute inset-0 bg-black/55" />
      )}

      {rect && (
        <div
          className="pointer-events-none absolute whitespace-nowrap rounded-md bg-black/85 px-2 py-1 font-mono text-[11px] text-white shadow-lg"
          style={{
            left: Math.min(rect.x, window.innerWidth - 110),
            top: rect.y > 30 ? rect.y - 26 : rect.y + rect.height + 6,
          }}
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
