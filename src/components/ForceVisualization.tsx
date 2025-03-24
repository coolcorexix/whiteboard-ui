import React from 'react';
import { BaseItem } from './Canvas';
import { useSimulationStore } from '../store/simulationStore';

// Define and export the interfaces
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
  const { planetaryForces } = useSimulationStore();

  if (!showForces) return null;

  return (
    <>
      {/* Detailed force vectors between planets */}
      {detailedForceVectors.map((vector, index) => {
        // Find source and target planets
        const sourcePlanet = items.find(item => item.id === vector.sourcePlanetId);
        const targetPlanet = items.find(item => item.id === vector.targetPlanetId);
        
        if (!sourcePlanet || !targetPlanet) return null;
        
        // Get center positions
        const sourceX = sourcePlanet.x + sourcePlanet.width / 2;
        const sourceY = sourcePlanet.y + sourcePlanet.height / 2;
        const targetX = targetPlanet.x + targetPlanet.width / 2;
        const targetY = targetPlanet.y + targetPlanet.height / 2;
        
        // Calculate force magnitude for scaling
        const forceMagnitude = Math.sqrt(vector.forceX * vector.forceX + vector.forceY * vector.forceY);
        const scale = 200; // Scale factor for visualization
        
        // Calculate normalized force components
        const normalizedForceX = vector.forceX / forceMagnitude;
        const normalizedForceY = vector.forceY / forceMagnitude;
        
        // Calculate scaled force components
        const scaledForceX = normalizedForceX * scale;
        const scaledForceY = normalizedForceY * scale;
        
        // Define force line color based on source planet's role and planetaryForces setting
        const isCentralSource = items[0]?.id === sourcePlanet.id;
        const forceColor = isCentralSource ? 'rgba(255, 165, 0, 0.7)' : // Orange for Sun
                            planetaryForces ? 'rgba(100, 149, 237, 0.7)' : // Blue for planet-planet forces
                            'rgba(70, 70, 70, 0.3)'; // Gray and faded for disabled planet-planet forces

        // Skip rendering planet-planet forces if they're disabled
        if (!planetaryForces && !isCentralSource) {
          return null;
        }
        
        // Adjust display for disabled planet-planet forces
        const lineWidth = isCentralSource || planetaryForces ? 2 : 1;
        const dashArray = !planetaryForces && !isCentralSource ? "5,5" : "none";
        
        return (
          <svg 
            key={`force-${index}`} 
            style={{ 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              width: canvasWidth, 
              height: canvasHeight, 
              pointerEvents: 'none',
              zIndex: 10
            }}
          >
            {/* Draw the force vector from the source to the target planet */}
            <line 
              x1={sourceX} 
              y1={sourceY} 
              x2={targetX} 
              y2={targetY} 
              stroke={forceColor}
              strokeWidth={lineWidth}
              strokeDasharray={dashArray}
            />
            {/* Add arrowhead pointing toward the target planet */}
            <polygon 
              points={`${targetX},${targetY} 
                      ${targetX - normalizedForceX * 10 - normalizedForceY * 5},${targetY - normalizedForceY * 10 + normalizedForceX * 5} 
                      ${targetX - normalizedForceX * 10 + normalizedForceY * 5},${targetY - normalizedForceY * 10 - normalizedForceX * 5}`} 
              fill={forceColor} 
            />
          </svg>
        );
      })}
      
      {/* Velocity vectors */}
      {velocityVectors.map((vector, index) => {
        const planet = items.find(item => item.id === vector.planetId);
        if (!planet) return null;
        
        const planetX = planet.x + planet.width / 2;
        const planetY = planet.y + planet.height / 2;
        
        const velocityScale = 5; // Scale factor for velocity visualization
        
        // Calculate endpoints for each vector
        const totalEndX = planetX + vector.velocityX * velocityScale;
        const totalEndY = planetY + vector.velocityY * velocityScale;
        
        const radialEndX = planetX + vector.radialVelocityX * velocityScale;
        const radialEndY = planetY + vector.radialVelocityY * velocityScale;
        
        const perpEndX = planetX + vector.perpVelocityX * velocityScale;
        const perpEndY = planetY + vector.perpVelocityY * velocityScale;
        
        return (
          <svg 
            key={`velocity-${index}`} 
            style={{ 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              width: canvasWidth, 
              height: canvasHeight, 
              pointerEvents: 'none',
              zIndex: 20
            }}
          >
            {/* Total velocity vector */}
            <line 
              x1={planetX} 
              y1={planetY} 
              x2={totalEndX} 
              y2={totalEndY} 
              stroke="rgba(255, 255, 255, 0.7)" 
              strokeWidth={2} 
            />
            
            {/* Radial velocity component */}
            <line 
              x1={planetX} 
              y1={planetY} 
              x2={radialEndX} 
              y2={radialEndY} 
              stroke="rgba(255, 0, 0, 0.7)" 
              strokeWidth={1.5} 
            />
            
            {/* Perpendicular velocity component */}
            <line 
              x1={planetX} 
              y1={planetY} 
              x2={perpEndX} 
              y2={perpEndY} 
              stroke="rgba(0, 255, 0, 0.7)" 
              strokeWidth={1.5} 
            />
          </svg>
        );
      })}
    </>
  );
};

export default ForceVisualization; 