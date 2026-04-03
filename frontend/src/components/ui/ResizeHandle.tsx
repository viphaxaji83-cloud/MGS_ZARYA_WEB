import type { PointerEventHandler } from 'react';

interface Props {
  onPointerDown: PointerEventHandler<HTMLDivElement>;
  lineColor?: string;
  background?: string;
}

export function ResizeHandle({
  onPointerDown,
  lineColor = 'rgba(50, 48, 48, 0.14)',
  background = 'transparent',
}: Props) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-hidden="true"
      onPointerDown={onPointerDown}
      style={{
        width: '10px',
        flex: '0 0 10px',
        cursor: 'col-resize',
        position: 'relative',
        touchAction: 'none',
        background,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: '50%',
          width: '2px',
          transform: 'translateX(-50%)',
          background: lineColor,
        }}
      />
    </div>
  );
}
