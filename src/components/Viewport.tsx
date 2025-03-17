import React, { useState, useCallback } from 'react';
import { Canvas } from './Canvas';

interface ViewportProps {
  mode: 'pan' | 'add';
}

export const Viewport: React.FC<ViewportProps> = ({ mode }) => {
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = () => {
    if (mode === 'pan') {
      setIsDragging(true);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleDrag = useCallback((deltaX: number, deltaY: number) => {
    setTransform(prev => ({
      ...prev,
      x: prev.x + deltaX,
      y: prev.y + deltaY,
      scale: 1 // Keep scale fixed at 1
    }));
  }, []);

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: '#e5e5e5'
      }}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <Canvas
        transform={transform}
        onDrag={handleDrag}
        isDragging={isDragging}
        mode={mode}
      />
    </div>
  );
}; 