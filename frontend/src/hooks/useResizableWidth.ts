import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

type ResizeDirection = 'leading' | 'trailing';

interface Options {
  storageKey: string;
  defaultWidth: number;
  minWidth: number;
  maxWidth: number | (() => number);
  direction: ResizeDirection;
}

function readStoredWidth(storageKey: string, fallbackWidth: number) {
  if (typeof window === 'undefined') return fallbackWidth;

  const rawValue = window.localStorage.getItem(storageKey);
  const parsedValue = rawValue ? Number.parseInt(rawValue, 10) : Number.NaN;

  return Number.isFinite(parsedValue) ? parsedValue : fallbackWidth;
}

export function useResizableWidth({ storageKey, defaultWidth, minWidth, maxWidth, direction }: Options) {
  const resolveMaxWidth = useCallback(() => {
    const nextMaxWidth = typeof maxWidth === 'function' ? maxWidth() : maxWidth;
    return Math.max(minWidth, nextMaxWidth);
  }, [maxWidth, minWidth]);

  const clampWidth = useCallback((nextWidth: number) => {
    const boundedWidth = Math.min(Math.max(nextWidth, minWidth), resolveMaxWidth());
    return Math.round(boundedWidth);
  }, [minWidth, resolveMaxWidth]);

  const [width, setWidth] = useState(() => clampWidth(readStoredWidth(storageKey, defaultWidth)));
  const widthRef = useRef(width);

  useEffect(() => {
    widthRef.current = width;
  }, [width]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(storageKey, String(width));
  }, [storageKey, width]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const syncWidth = () => {
      setWidth((currentWidth) => clampWidth(currentWidth));
    };

    syncWidth();
    window.addEventListener('resize', syncWidth);
    return () => window.removeEventListener('resize', syncWidth);
  }, [clampWidth]);

  const startResize = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (typeof window === 'undefined') return;

    event.preventDefault();

    const handle = event.currentTarget;
    const pointerId = event.pointerId;
    handle.setPointerCapture(pointerId);

    const startX = event.clientX;
    const startWidth = widthRef.current;
    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    // Block interaction with iframes / map embeds while dragging
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;cursor:col-resize;';
    document.body.appendChild(overlay);

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const nextWidth = direction === 'leading' ? startWidth + deltaX : startWidth - deltaX;
      setWidth(clampWidth(nextWidth));
    };

    const stopResizing = () => {
      overlay.remove();
      try { handle.releasePointerCapture(pointerId); } catch { /* already released */ }
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', stopResizing);
      window.removeEventListener('pointercancel', stopResizing);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', stopResizing);
    window.addEventListener('pointercancel', stopResizing);
  }, [clampWidth, direction]);

  return { width, startResize };
}
