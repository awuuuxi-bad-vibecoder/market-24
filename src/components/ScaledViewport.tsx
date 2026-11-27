import React, { useEffect, useState } from 'react';

export const STAGE_W = 1280;
export const STAGE_H = 720;

interface ScaledViewportProps {
  children: React.ReactNode;
}

export const ScaledViewport: React.FC<ScaledViewportProps> = ({ children }) => {
  const [scale, setScale] = useState<number>(() => {
    if (typeof window === 'undefined') return 1;
    return Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H);
  });

  useEffect(() => {
    const updateScale = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      setScale(Math.min(vw / STAGE_W, vh / STAGE_H));
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center pointer-events-none overflow-hidden">
      <div
        style={{
          width: `${STAGE_W}px`,
          height: `${STAGE_H}px`,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
        }}
        className="relative shrink-0 pointer-events-auto"
      >
        {children}
      </div>
    </div>
  );
};
