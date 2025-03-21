import React from 'react';

interface CanvasBackgroundProps {
  width: number;
  height: number;
  onClick: (e: React.MouseEvent) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  cursor: string;
  style?: React.CSSProperties;
}

const CanvasBackground: React.FC<CanvasBackgroundProps> = ({
  width,
  height,
  onClick,
  onMouseMove,
  cursor,
  style = {}
}) => {
  return (
    <div
      style={{
        position: 'absolute',
        width: `${width}px`,
        height: `${height}px`,
        backgroundColor: '#0a0a18', // Dark blue background like space
        backgroundImage: 'radial-gradient(white, rgba(255,255,255,.2) 2px, transparent 7px)', 
        backgroundSize: '100px 100px', // Stars in background
        cursor,
        zIndex: 1,
        ...style
      }}
      onClick={onClick}
      onMouseMove={onMouseMove}
    />
  );
};

export default CanvasBackground; 