import React, { useRef, useState } from 'react';

interface CanvasProps {
  onDrag: (deltaX: number, deltaY: number) => void;
  transform: { x: number; y: number; scale: number };
  isDragging: boolean;
  mode: 'pan' | 'add';
}

interface CanvasItem {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
}

export const Canvas: React.FC<CanvasProps> = ({ onDrag, transform, isDragging, mode }) => {
  const [items, setItems] = useState<CanvasItem[]>([]);
  const lastMousePos = useRef<{ x: number; y: number } | null>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && lastMousePos.current) {
      const deltaX = e.clientX - lastMousePos.current.x;
      const deltaY = e.clientY - lastMousePos.current.y;
      onDrag(deltaX, deltaY);
    }
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleClick = (e: React.MouseEvent) => {
    if (mode === 'add') {
      // Calculate the position in the canvas coordinate system
      const rect = e.currentTarget.getBoundingClientRect();
      const x = (e.clientX - rect.left) / transform.scale;
      const y = (e.clientY - rect.top) / transform.scale;
      
      const newItem: CanvasItem = {
        id: Date.now().toString(),
        x,
        y,
        width: 200,
        height: 100,
        content: 'New Item'
      };
      setItems([...items, newItem]);
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        width: '100000px',
        height: '100000px',
        transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
        transformOrigin: '0 0',
        backgroundColor: '#f0f0f0',
        cursor: isDragging ? 'grabbing' : mode === 'add' ? 'crosshair' : 'default'
      }}
      onMouseMove={handleMouseMove}
      onClick={handleClick}
    >
      {items.map((item) => (
        <div
          key={item.id}
          style={{
            position: 'absolute',
            left: item.x,
            top: item.y,
            width: item.width,
            height: item.height,
            backgroundColor: 'green',
            border: '1px solid #ccc',
            borderRadius: '4px',
            padding: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}
        >
          {item.content}
        </div>
      ))}
    </div>
  );
}; 