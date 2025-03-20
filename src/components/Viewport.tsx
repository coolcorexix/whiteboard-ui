import React, { useState, useCallback } from 'react';
import { Canvas, calculateCenteredTransform } from './Canvas';

interface ViewportProps {
  mode: 'pan' | 'add';
}

export const Viewport: React.FC<ViewportProps> = ({ mode }) => {
  const [transform, setTransform] = useState(() => calculateCenteredTransform(1));
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
      y: prev.y + deltaY
    }));
  }, []);

  const handleWheel = (e: React.WheelEvent) => {
    const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
    
    // Get mouse position relative to the viewport
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    setTransform(prev => {
      const newScale = Math.max(0.1, Math.min(5, prev.scale * scaleFactor));
      
      // Calculate how much the content will change in size
      const scaleChange = newScale - prev.scale;
      
      // Calculate the position change needed to keep the mouse point fixed
      const dx = -(mouseX - prev.x) * (scaleChange / prev.scale);
      const dy = -(mouseY - prev.y) * (scaleChange / prev.scale);

      return {
        x: prev.x + dx,
        y: prev.y + dy,
        scale: newScale
      };
    });
  };

  // Function to reset view to center
  const resetView = () => {
    setTransform(calculateCenteredTransform(transform.scale));
  };

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
      onWheel={handleWheel}
    >
      {/* Optional UI for resetting view */}
      <div style={{ position: 'absolute', bottom: 20, right: 20, zIndex: 10 }}>
        <button onClick={resetView}>Center View</button>
      </div>
      
      <Canvas
        transform={transform}
        onDrag={handleDrag}
        isDragging={isDragging}
        mode={mode}
      />
    </div>
  );
}; 