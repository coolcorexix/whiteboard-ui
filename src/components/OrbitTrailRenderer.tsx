import React from 'react';
import { OrbitPath } from './OrbitPathVisualization';

interface OrbitTrailRendererProps {
  canvasWidth: number;
  canvasHeight: number;
  orbitPaths: OrbitPath[];
  showTrails: boolean;
  opacity?: number;
  lineWidth?: number;
  fadeTrail?: boolean;
}

const OrbitTrailRenderer: React.FC<OrbitTrailRendererProps> = ({
  canvasWidth,
  canvasHeight,
  orbitPaths,
  showTrails,
  opacity = 0.7,
  lineWidth = 2,
  fadeTrail = true
}) => {
  console.log("🚀 ~ orbitPaths:", orbitPaths)
  if (!showTrails) return null;

  return (
    <svg 
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: `${canvasWidth}px`,
        height: `${canvasHeight}px`,
        pointerEvents: 'none',
        zIndex: 20
      }}
    >
      <defs>
        {orbitPaths.map(path => {
          if (fadeTrail) {
            // Get the first and last points for gradient direction
            const points = path.points;
            if (points.length < 2) return null;
            
            const startPoint = points[0];
            const endPoint = points[points.length - 1];
            
            return (
              <linearGradient 
                key={`grad-${path.planetId}`}
                id={`trail-gradient-${path.planetId}`} 
                x1={startPoint.x} 
                y1={startPoint.y} 
                x2={endPoint.x} 
                y2={endPoint.y} 
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0%" stopColor={path.color} stopOpacity="0.1" />
                <stop offset="100%" stopColor={path.color} stopOpacity={opacity} />
              </linearGradient>
            );
          }
          return null;
        })}
      </defs>
      
      {orbitPaths.map((path) => {
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
          <path
            key={`trail-${path.planetId}`}
            d={pathData}
            stroke={fadeTrail ? `url(#trail-gradient-${path.planetId})` : path.color}
            strokeWidth={lineWidth}
            strokeOpacity={fadeTrail ? 1 : opacity}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );
      })}
    </svg>
  );
};

export default OrbitTrailRenderer; 