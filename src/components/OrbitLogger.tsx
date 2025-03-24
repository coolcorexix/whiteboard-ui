import React, { useEffect, useState, useRef } from 'react';
import { BaseItem, CANVAS_HEIGHT, CANVAS_WIDTH } from './Canvas';
import OrbitPathVisualization, { OrbitPoint, OrbitPath } from './OrbitPathVisualization';
import OrbitTrailRenderer from './OrbitTrailRenderer';

interface OrbitLoggerProps {
  items: BaseItem[];
  isPlaying: boolean;
  maxPointsPerOrbit?: number;
  loggingFrequency?: number; // milliseconds between logging points
}

const OrbitLogger: React.FC<OrbitLoggerProps> = ({
  items,
  isPlaying,
  maxPointsPerOrbit = 100,
  loggingFrequency = 1000 // default to log every 1 second
}) => {
  const [orbitPaths, setOrbitPaths] = useState<OrbitPath[]>([]);
  const lastLogTimeRef = useRef<number>(0);

  // Effect to initialize orbit paths for all planets
  useEffect(() => {
    // Only consider planets (not the central body at index 0)
    const planetItems = items.filter((item, index) => index > 0);
    
    // Initialize orbit paths with empty points arrays
    const initialPaths = planetItems.map(planet => ({
      planetId: planet.id,
      points: [],
      color: planet.data.color
    }));
    
    setOrbitPaths(initialPaths);
  }, [JSON.stringify(items.map(item => item.id))]);

  // Effect to log planet positions at regular intervals, throttled to run once per second
  useEffect(() => {
    if (!isPlaying) return;

    // Create a throttled update function
    const updateOrbitPaths = () => {
      const now = Date.now();
      
      // Only update if enough time has passed since last update
      if (now - lastLogTimeRef.current >= loggingFrequency) {
        lastLogTimeRef.current = now;
        
        // Update orbit paths with current positions
        setOrbitPaths(prevPaths => {
          const updatedPaths = prevPaths.map(path => {
            // Find the corresponding planet
            const planet = items.find(item => item.id === path.planetId);
            if (!planet) return path;

            // Create a new point for the current position
            const newPoint: OrbitPoint = {
              x: planet.x + planet.width / 2, // Center of the planet
              y: planet.y + planet.height / 2 // Center of the planet
            };

            // Add the point to the path, limiting the number of points
            const updatedPoints = [...path.points, newPoint];
            
            if (updatedPoints.length > maxPointsPerOrbit) {
              // Remove the oldest point if we exceed the maximum
              updatedPoints.shift();
            }

            return {
              ...path,
              points: updatedPoints
            };
          });
          
          return updatedPaths;
        });
      }
    };

    // Set up a requestAnimationFrame loop for smoother updates
    let animationFrameId: number;
    const tick = () => {
      updateOrbitPaths();
      animationFrameId = requestAnimationFrame(tick);
    };
    
    // Start the animation loop
    animationFrameId = requestAnimationFrame(tick);
    
    // Clean up
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [items, isPlaying, maxPointsPerOrbit, loggingFrequency]);

  return <OrbitTrailRenderer
    canvasWidth={CANVAS_WIDTH}
    canvasHeight={CANVAS_HEIGHT}
    orbitPaths={orbitPaths}
    showTrails={true}
  />;
};

export default OrbitLogger; 