import { useEffect, useRef, useState } from 'react';

export function useElementWidth<T extends HTMLElement>() {
  const elementRef = useRef<T | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const updateWidth = () => {
      setWidth(element.getBoundingClientRect().width);
    };

    updateWidth();

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setWidth(entry.contentRect.width);
      }
    });

    observer.observe(element);
    window.addEventListener('resize', updateWidth);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateWidth);
    };
  }, []);

  return { ref: elementRef, width };
}
