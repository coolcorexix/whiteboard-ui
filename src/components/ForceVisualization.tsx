import React from 'react';
import { BaseItem } from './Canvas';

export interface ForceVector {
  targetPlanetId: string;
  sourcePlanetId: string;
  forceX: number;
  forceY: number;
}

export interface VelocityVector {
  planetId: string;
  velocityX: number;
  velocityY: number;
  perpVelocityX: number;
  perpVelocityY: number;
  radialVelocityX: number;
  radialVelocityY: number;
}

interface ForceVisualizationProps {
  canvasWidth: number;
  canvasHeight: number;
  items: BaseItem[];
  detailedForceVectors: ForceVector[];
  velocityVectors: VelocityVector[];
  showForces: boolean;
}

const ForceVisualization: React.FC<ForceVisualizationProps> = ({
  canvasWidth,
  canvasHeight,
  items,
  detailedForceVectors,
  velocityVectors,
  showForces
}) => {
  if (!showForces) return null;

  return (
    <>
      {/* Detailed Force Vector Visualization - Show individual forces from each planet */}
      {detailedForceVectors.map((vector, index) => {
        const targetPlanet = items.find(item => item.id === vector.targetPlanetId);
        const sourcePlanet = items.find(item => item.id === vector.sourcePlanetId);
        
        if (!targetPlanet || !sourcePlanet || 
            targetPlanet.type !== 'planet' || 
            sourcePlanet.type !== 'planet') return null;
        
        const centerX = targetPlanet.x + targetPlanet.width / 2;
        const centerY = targetPlanet.y + targetPlanet.height / 2;
        
        // Calculate the magnitude of this specific force
        const forceMagnitude = Math.sqrt(vector.forceX * vector.forceX + vector.forceY * vector.forceY);
        
        // Skip if force is too small
        if (forceMagnitude < 0.01) return null;
        
        // Normalize the vector to a visible length, log scale looks better for widely varying magnitudes
        const scale = Math.min(80, 15 * Math.log(forceMagnitude + 1));
        const normX = (vector.forceX / forceMagnitude) * scale;
        const normY = (vector.forceY / forceMagnitude) * scale;
        
        // Calculate endpoint of the vector
        const endX = centerX + normX;
        const endY = centerY + normY;

        // Use source planet's color for the vector with different opacity
        const vectorColor = sourcePlanet.data.color || '#FFFFFF';
        
        // Draw the arrow
        return (
          <svg key={`vector-${vector.targetPlanetId}-${vector.sourcePlanetId}`} style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: `${canvasWidth}px`,
            height: `${canvasHeight}px`,
            pointerEvents: 'none',
            zIndex: 101
          }}>
            {/* Main force vector line */}
            <line
              x1={centerX}
              y1={centerY}
              x2={endX}
              y2={endY}
              stroke={vectorColor}
              strokeWidth={1.5}
              strokeOpacity={0.7}
            />
            
            {/* Arrowhead */}
            <polygon 
              points={`
                ${endX},${endY}
                ${endX - normX * 0.1 - normY * 0.05},${endY - normY * 0.1 + normX * 0.05}
                ${endX - normX * 0.1 + normY * 0.05},${endY - normY * 0.1 - normX * 0.05}
              `}
              fill={vectorColor}
              fillOpacity={0.7}
            />
            
            {/* Small dot indicating the source planet */}
            <circle
              cx={endX}
              cy={endY}
              r={3}
              fill={vectorColor}
              fillOpacity={0.9}
            />
          </svg>
        );
      })}

      {/* Velocity Vector Visualization - Shows how velocity is decomposed */}
      {velocityVectors.map((vector) => {
        const planet = items.find(item => item.id === vector.planetId);
        if (!planet || planet.type !== 'planet') return null;
        
        const centerX = planet.x + planet.width / 2;
        const centerY = planet.y + planet.height / 2;
        
        // Skip central body (no interesting velocity components)
        if (planet.id === items[0]?.id) return null;
        
        // Calculate magnitude of velocity for scaling
        const velocityMagnitude = Math.sqrt(
          vector.velocityX * vector.velocityX + 
          vector.velocityY * vector.velocityY
        );
        
        // Skip if velocity is too small
        if (velocityMagnitude < 0.01) return null;
        
        // Scale factor for visualization
        const scale = 5;
        
        // Calculate endpoints
        const totalEndX = centerX + vector.velocityX * scale;
        const totalEndY = centerY + vector.velocityY * scale;
        const radialEndX = centerX + vector.radialVelocityX * scale;
        const radialEndY = centerY + vector.radialVelocityY * scale;
        const perpEndX = centerX + vector.perpVelocityX * scale;
        const perpEndY = centerY + vector.perpVelocityY * scale;
        
        return (
          <svg key={`velocity-${vector.planetId}`} style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: `${canvasWidth}px`,
            height: `${canvasHeight}px`,
            pointerEvents: 'none',
            zIndex: 102
          }}>
            {/* Total velocity vector - white */}
            <line
              x1={centerX}
              y1={centerY}
              x2={totalEndX}
              y2={totalEndY}
              stroke="white"
              strokeWidth={2}
              strokeOpacity={0.8}
            />
            <polygon 
              points={`
                ${totalEndX},${totalEndY}
                ${totalEndX - vector.velocityX * 0.1 * scale - vector.velocityY * 0.05 * scale},
                ${totalEndY - vector.velocityY * 0.1 * scale + vector.velocityX * 0.05 * scale}
                ${totalEndX - vector.velocityX * 0.1 * scale + vector.velocityY * 0.05 * scale},
                ${totalEndY - vector.velocityY * 0.1 * scale - vector.velocityX * 0.05 * scale}
              `}
              fill="white"
              fillOpacity={0.8}
            />
            
            {/* Radial velocity component - red */}
            <line
              x1={centerX}
              y1={centerY}
              x2={radialEndX}
              y2={radialEndY}
              stroke="red"
              strokeWidth={1.5}
              strokeOpacity={0.7}
              strokeDasharray="5,3"
            />
            
            {/* Perpendicular velocity component - green (this is what creates the orbit) */}
            <line
              x1={centerX}
              y1={centerY}
              x2={perpEndX}
              y2={perpEndY}
              stroke="#00FF00"
              strokeWidth={1.5}
              strokeOpacity={0.9}
            />
            <polygon 
              points={`
                ${perpEndX},${perpEndY}
                ${perpEndX - vector.perpVelocityX * 0.1 * scale - vector.perpVelocityY * 0.05 * scale},
                ${perpEndY - vector.perpVelocityY * 0.1 * scale + vector.perpVelocityX * 0.05 * scale}
                ${perpEndX - vector.perpVelocityX * 0.1 * scale + vector.perpVelocityY * 0.05 * scale},
                ${perpEndY - vector.perpVelocityY * 0.1 * scale - vector.perpVelocityX * 0.05 * scale}
              `}
              fill="#00FF00"
              fillOpacity={0.9}
            />
            
            {/* Small legend */}
            <text
              x={totalEndX + 10}
              y={totalEndY}
              fill="white"
              fontSize="12"
              style={{ pointerEvents: 'none' }}
            >
              Total Velocity
            </text>
            <text
              x={perpEndX + 10}
              y={perpEndY}
              fill="#00FF00"
              fontSize="12"
              style={{ pointerEvents: 'none' }}
            >
              Orbital Component
            </text>
            <text
              x={radialEndX + 10}
              y={radialEndY}
              fill="red"
              fontSize="12"
              style={{ pointerEvents: 'none' }}
            >
              Radial Component
            </text>
          </svg>
        );
      })}
    </>
  );
};

export default ForceVisualization; 