import { useEffect, useRef, useState, type RefObject } from 'react';

const HIT_MARGIN = 8;

export function useClickthrough(targetRef: RefObject<HTMLElement | null>) {
  const [interactive, setInteractive] = useState(false);
  const interactiveRef = useRef(false);

  useEffect(() => {
    let raf = 0;
    let lastX = 0;
    let lastY = 0;

    const tick = () => {
      raf = 0;
      const target = targetRef.current;
      if (!target) return;
      const rect = target.getBoundingClientRect();
      const inside =
        lastX >= rect.left - HIT_MARGIN &&
        lastX <= rect.right + HIT_MARGIN &&
        lastY >= rect.top - HIT_MARGIN &&
        lastY <= rect.bottom + HIT_MARGIN;

      if (inside !== interactiveRef.current) {
        interactiveRef.current = inside;
        setInteractive(inside);
        window.api.setClickthrough(!inside).catch(() => {});
      }
    };

    const onMove = (e: MouseEvent) => {
      lastX = e.clientX;
      lastY = e.clientY;
      if (raf) return;
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', onMove);
      if (raf) cancelAnimationFrame(raf);
      if (interactiveRef.current) {
        interactiveRef.current = false;
        window.api.setClickthrough(true).catch(() => {});
      }
    };
  }, [targetRef]);

  return interactive;
}
