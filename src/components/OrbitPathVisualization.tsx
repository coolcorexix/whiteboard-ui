import React from 'react';
import { BaseItem } from './Canvas';

export interface OrbitPoint {
  x: number;
  y: number;
}

export interface OrbitPath {
  planetId: string;
  points: OrbitPoint[];
  color: string;
}

interface OrbitPathVisualizationProps {
  canvasWidth: number;
  canvasHeight: number;
  items: BaseItem[];
  orbitPaths: OrbitPath[];
  showOrbits: boolean;
}

const OrbitPathVisualization: React.FC<OrbitPathVisualizationProps> = ({
  canvasWidth,
  canvasHeight,
  items,
  orbitPaths,
  showOrbits
}) => {
  if (!showOrbits) return null;

  return (
    <>
      {orbitPaths.map((path) => {
        // Find the corresponding planet to get its color
        const planet = items.find(item => item.id === path.planetId);
        if (!planet) return null;
        
        // Create an SVG path from the orbit points
        const points = path.points;
        if (points.length < 2) return null;
        
        // Create SVG path data
        const pathData = points.reduce((pathString, point, index) => {
          if (index === 0) {
            return `M ${point.x} ${point.y}`;
          }
          return `${pathString} L ${point.x} ${point.y}`;
        }, '');
        
        return (
          <svg key={`orbit-${path.planetId}`} style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: `${canvasWidth}px`,
            height: `${canvasHeight}px`,
            pointerEvents: 'none',
            zIndex: 10
          }}>
            <path
              d={pathData}
              stroke={planet.data.color}
              strokeWidth={3}
              fill="none"
              strokeOpacity={0.6}
              strokeDasharray="5,5"
            />
          </svg>
        );
      })}
    </>
  );
};

export default OrbitPathVisualization; 