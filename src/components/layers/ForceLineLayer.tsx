import React from 'react';
import { BaseItem } from '../Canvas';

interface ForceLineLayerProps {
  canvasWidth: number;
  canvasHeight: number;
  forceLines: {from: BaseItem, to: BaseItem, strength: number}[];
  showForces: boolean;
}

const ForceLineLayer: React.FC<ForceLineLayerProps> = ({
  canvasWidth,
  canvasHeight,
  forceLines,
  showForces
}) => {
  if (!showForces) return null;

  return (
    <>
      {forceLines.map((line, index) => {
        const startX = line.from.x + line.from.width/2;
        const startY = line.from.y + line.from.height/2;
        const endX = line.to.x + line.to.width/2;
        const endY = line.to.y + line.to.height/2;
        
        // Calculate distance for line segment
        const dx = endX - startX;
        const dy = endY - startY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Create normalized vector for direction
        const nx = dx / distance;
        const ny = dy / distance;
        
        // Adjust start and end positions to be on the edge of planets, not center
        const radius1 = line.from.data.radius;
        const radius2 = line.to.data.radius;
        
        const adjustedStartX = startX + nx * radius1;
        const adjustedStartY = startY + ny * radius1;
        const adjustedEndX = endX - nx * radius2;
        const adjustedEndY = endY - ny * radius2;
        
        return (
          <svg key={`force-${index}`} style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: `${canvasWidth}px`,
            height: `${canvasHeight}px`,
            pointerEvents: 'none',
            zIndex: 20
          }}>
            <line
              x1={adjustedStartX}
              y1={adjustedStartY}
              x2={adjustedEndX}
              y2={adjustedEndY}
              stroke={`rgba(255, 255, 255, ${line.strength})`}
              strokeWidth={line.strength * 5}
            />
          </svg>
        );
      })}
    </>
  );
};

export default ForceLineLayer; 