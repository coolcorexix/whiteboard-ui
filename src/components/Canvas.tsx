import React, { useRef, useState, useEffect, useCallback } from 'react';
import { PlanetItemType } from './ItemTypes/PlanetItemType';
import { useSimulationStore } from '../store/simulationStore';
import ForceVisualization, { ForceVector, VelocityVector } from './ForceVisualization';
import OrbitPathVisualization, { OrbitPath } from './OrbitPathVisualization';
import PlanetLayer from './layers/PlanetLayer';
import ForceLineLayer from './layers/ForceLineLayer';
import CanvasBackground from './layers/CanvasBackground';

// Base item interface that all item types will extend
export interface BaseItem {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: string;
  data: any;
}

// Definition for any item type configuration
export interface ItemTypeConfig {
  defaultWidth: number;
  defaultHeight: number;
  defaultData: any;
  render: (item: BaseItem) => React.ReactNode;
}

// Interface for orbit path points
interface OrbitPoint {
  x: number;
  y: number;
}

interface CanvasProps {
  onDrag: (deltaX: number, deltaY: number) => void;
  transform: { x: number; y: number; scale: number };
  isDragging: boolean;
  mode: 'pan' | 'add';
  itemTypes?: Record<string, ItemTypeConfig>;
  selectedItemType?: string;
  onInitialize?: () => void;
}

// Constants for canvas size
export const CANVAS_WIDTH = 100000;
export const CANVAS_HEIGHT = 100000;
export const CANVAS_CENTER_X = CANVAS_WIDTH / 2;
export const CANVAS_CENTER_Y = CANVAS_HEIGHT / 2;

// Helper function to calculate the initial transform for centering the canvas
export const calculateCenteredTransform = (scale: number = 1): { x: number; y: number; scale: number } => {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  // Position the canvas center in the middle of the viewport
  return {
    x: viewportWidth / 2 - CANVAS_CENTER_X * scale,
    y: viewportHeight / 2 - CANVAS_CENTER_Y * scale,
    scale
  };
};

export const Canvas: React.FC<CanvasProps> = ({ 
  onDrag, 
  transform, 
  isDragging, 
  mode, 
  itemTypes,
  selectedItemType = 'planet', // Default to planet type
  onInitialize
}) => {
  const [items, setItems] = useState<BaseItem[]>([]);
  const [forceLines, setForceLines] = useState<{from: BaseItem, to: BaseItem, strength: number}[]>([]);
  const [orbitPaths, setOrbitPaths] = useState<OrbitPath[]>([]);
  const lastMousePos = useRef<{ x: number; y: number } | null>(null);
  const isInitialized = useRef(false);
  const animationFrameId = useRef<number | null>(null);
  const lastUpdateTime = useRef<number>(Date.now());
  
  // Get simulation state from Zustand store
  const { isPlaying, showForces, showOrbits, setFps, setIsPlaying, setShowForces } = useSimulationStore();
  const isSimulationRunning = useRef<boolean>(isPlaying);
  
  // Update the ref when isPlaying changes
  useEffect(() => {
    isSimulationRunning.current = isPlaying;
  }, [isPlaying]);
  
  // FPS monitoring
  const frameCount = useRef<number>(0);
  const lastFpsUpdate = useRef<number>(Date.now());

  // Define default item types with imported PlanetItemType
  const defaultItemTypes: Record<string, ItemTypeConfig> = {
    planet: PlanetItemType
  };

  // Use a merged itemTypes with defaultItemTypes as fallback
  const mergedItemTypes = itemTypes || defaultItemTypes;

  // Call onInitialize once when component mounts
  useEffect(() => {
    if (!isInitialized.current && onInitialize) {
      onInitialize();
      isInitialized.current = true;
    }
  }, [onInitialize]);

  // Constants for physics simulation
  const G = 6.67430; // Gravitational constant (scaled for our simulation)
  
  // Calculate force lines for visualization
  const calculateForceLines = useCallback((planetItems: BaseItem[]) => {
    if (!showForces) {
      setForceLines([]);
      return;
    }

    const newForceLines: {from: BaseItem, to: BaseItem, strength: number}[] = [];
    
    // Only calculate forces for planets
    const planetOnlyItems = planetItems.filter(item => item.type === 'planet');
    
    // For each pair of planets, calculate the force
    for (let i = 0; i < planetOnlyItems.length; i++) {
      for (let j = i + 1; j < planetOnlyItems.length; j++) {
        const planet1 = planetOnlyItems[i];
        const planet2 = planetOnlyItems[j];
        
        // Calculate distance between planets
        const dx = planet2.x - planet1.x;
        const dy = planet2.y - planet1.y;
        const distanceSquared = dx * dx + dy * dy;
        
        // Avoid division by zero and limit extreme forces at very close distances
        if (distanceSquared < 100) continue;
        
        // Calculate gravitational force
        const distance = Math.sqrt(distanceSquared);
        const force = G * planet1.data.mass * planet2.data.mass / distanceSquared;
        
        // Normalize force for visualization (logarithmic scale looks better for vastly different forces)
        const normalizedForce = Math.log(force + 1) / 10;
        
        newForceLines.push({
          from: planet1,
          to: planet2,
          strength: normalizedForce
        });
      }
    }
    
    setForceLines(newForceLines);
  }, [G, showForces]);
  
  // Calculate orbit prediction for a single planet
  const calculateOrbitPath = useCallback((planet: BaseItem, allPlanets: BaseItem[]) => {
    if (planet.data.mass >= 5000) {
      // Don't calculate orbits for very massive bodies (like the sun)
      return [];
    }
    
    // Create a deep copy of the planet to simulate its future positions
    const simulatedPlanet = {
      ...planet,
      data: {
        ...planet.data,
        velocity: { ...planet.data.velocity }
      }
    };
    
    const orbitPoints: OrbitPoint[] = [];
    
    // Add the current position as the first point
    orbitPoints.push({
      x: planet.x + planet.width / 2,
      y: planet.y + planet.height / 2
    });
    
    // Use a fixed time step for simulation
    const timeStep = 0.1; // in seconds
    
    // Simulate future positions (for up to 500 points or until we loop)
    for (let i = 0; i < 500; i++) {
      // Calculate forces on the simulated planet
      let totalForceX = 0;
      let totalForceY = 0;
      
      allPlanets.forEach(otherPlanet => {
        if (otherPlanet.id === simulatedPlanet.id) return;
        
        // Get center positions
        const planetX = simulatedPlanet.x + simulatedPlanet.width / 2;
        const planetY = simulatedPlanet.y + simulatedPlanet.height / 2;
        const otherX = otherPlanet.x + otherPlanet.width / 2;
        const otherY = otherPlanet.y + otherPlanet.height / 2;
        
        // Calculate distance
        const dx = otherX - planetX;
        const dy = otherY - planetY;
        const distanceSquared = dx * dx + dy * dy;
        
        // Avoid division by zero
        if (distanceSquared < 100) return;
        
        // Calculate force
        const distance = Math.sqrt(distanceSquared);
        const force = G * simulatedPlanet.data.mass * otherPlanet.data.mass / distanceSquared;
        
        // Add force components
        totalForceX += force * dx / distance;
        totalForceY += force * dy / distance;
      });
      
      // Calculate acceleration
      const accelerationX = totalForceX / simulatedPlanet.data.mass;
      const accelerationY = totalForceY / simulatedPlanet.data.mass;
      
      // Update velocity
      simulatedPlanet.data.velocity.x += accelerationX * timeStep;
      simulatedPlanet.data.velocity.y += accelerationY * timeStep;
      
      // Update position
      simulatedPlanet.x += simulatedPlanet.data.velocity.x * timeStep;
      simulatedPlanet.y += simulatedPlanet.data.velocity.y * timeStep;
      
      // Add the new position to our points array
      const newPoint = {
        x: simulatedPlanet.x + simulatedPlanet.width / 2,
        y: simulatedPlanet.y + simulatedPlanet.height / 2
      };
      orbitPoints.push(newPoint);
      
      // Check if we've completed a full orbit
      // We do this by seeing if we're close to the original position and heading in 
      // roughly the same direction as when we started
      if (i > 50) { // Only check after we've generated enough points
        const startPoint = orbitPoints[0];
        const distToStart = Math.sqrt(
          Math.pow(newPoint.x - startPoint.x, 2) + 
          Math.pow(newPoint.y - startPoint.y, 2)
        );
        
        // If we're close to the starting point, consider the orbit complete
        if (distToStart < planet.width) {
          break;
        }
      }
    }
    
    return orbitPoints;
  }, [G]);
  
  // Calculate orbit paths for all planets
  const calculateAllOrbitPaths = useCallback(() => {
    if (!showOrbits) {
      setOrbitPaths([]);
      return;
    }
    
    const planetItems = items.filter(item => item.type === 'planet');
    const newOrbitPaths: OrbitPath[] = [];
    
    // Skip calculation if we only have one planet (no orbit)
    if (planetItems.length <= 1) {
      setOrbitPaths([]);
      return;
    }
    
    // Calculate orbit paths for each planet
    planetItems.forEach(planet => {
      const orbitPoints = calculateOrbitPath(planet, planetItems);
      if (orbitPoints.length > 0) {
        newOrbitPaths.push({
          itemId: planet.id,
          points: orbitPoints
        });
      }
    });
    
    setOrbitPaths(newOrbitPaths);
  }, [items, calculateOrbitPath, showOrbits]);
  
  // Calculate orbits when planets change or when showOrbits changes
  useEffect(() => {
    calculateAllOrbitPaths();
  }, [items, calculateAllOrbitPaths, showOrbits]);
  
  // Replace the single force vector state with a more detailed structure
  const [detailedForceVectors, setDetailedForceVectors] = useState<ForceVector[]>([]);
  const [velocityVectors, setVelocityVectors] = useState<VelocityVector[]>([]);

  // Update the updatePlanetPositions function to clear vectors before adding new ones
  const updatePlanetPositions = useCallback(() => {
    const currentTime = Date.now();
    const deltaTime = (currentTime - lastUpdateTime.current) / 1000; // Convert to seconds
    lastUpdateTime.current = currentTime;

    // Update FPS counter
    frameCount.current += 1;
    if (currentTime - lastFpsUpdate.current > 1000) { // Update every second
      setFps(Math.round((frameCount.current * 1000) / (currentTime - lastFpsUpdate.current)));
      frameCount.current = 0;
      lastFpsUpdate.current = currentTime;
    }

    // Clear all vectors at each update to prevent accumulation
    setDetailedForceVectors([]);
    setVelocityVectors([]);

    // Only update if we have more than one item or simulation is running
    if (items.length <= 1 || !isSimulationRunning.current) {
      animationFrameId.current = requestAnimationFrame(updatePlanetPositions);
      return;
    }

    // Store all individual force vectors between planets
    const newDetailedForceVectors: ForceVector[] = [];

    // Store velocity vectors for visualization
    const newVelocityVectors: VelocityVector[] = [];

    setItems(prevItems => {
      const updatedItems = prevItems.map(item => {
        // Only apply physics to planets
        if (item.type !== 'planet') return item;

        const planet = { ...item };
        if (!planet.data.velocity) {
          planet.data.velocity = { x: 0, y: 0 };
        }

        // Skip the central body (assumed to be first planet)
        if (planet.id === prevItems[0]?.id) {
          // Still calculate velocity components for visualizing
          if (prevItems.length > 1) {
            // Assume the planet orbits around the central body
            const centralPlanet = prevItems[0];
            
            // Calculate center points
            const centralX = centralPlanet.x + centralPlanet.width / 2;
            const centralY = centralPlanet.y + centralPlanet.height / 2;
            const planetX = planet.x + planet.width / 2;
            const planetY = planet.y + planet.height / 2;
            
            // Calculate velocity components
            newVelocityVectors.push({
              planetId: planet.id,
              velocityX: planet.data.velocity.x,
              velocityY: planet.data.velocity.y,
              perpVelocityX: 0, // Central body doesn't have perpendicular component
              perpVelocityY: 0,
              radialVelocityX: 0, // Central body doesn't have radial component
              radialVelocityY: 0
            });
          }
          return planet;
        }

        // Calculate velocity components for non-central planets
        if (prevItems.length > 1) {
          // Assume the first planet is the central body
          const centralPlanet = prevItems[0];
          
          // Calculate center points
          const centralX = centralPlanet.x + centralPlanet.width / 2;
          const centralY = centralPlanet.y + centralPlanet.height / 2;
          const planetX = planet.x + planet.width / 2;
          const planetY = planet.y + planet.height / 2;
          
          // Calculate vector from planet to central body (radial direction)
          const dx = centralX - planetX;
          const dy = centralY - planetY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          // Normalize the radial vector
          const normalizedDx = dx / distance;
          const normalizedDy = dy / distance;
          
          // Calculate perpendicular vector (tangential direction)
          const perpDx = -normalizedDy;
          const perpDy = normalizedDx;
          
          // Decompose velocity into radial and perpendicular components
          // Project velocity onto radial direction (dot product)
          const radialVelocity = planet.data.velocity.x * normalizedDx + planet.data.velocity.y * normalizedDy;
          const radialVelocityX = radialVelocity * normalizedDx;
          const radialVelocityY = radialVelocity * normalizedDy;
          
          // Project velocity onto perpendicular direction (dot product)
          const perpVelocity = planet.data.velocity.x * perpDx + planet.data.velocity.y * perpDy;
          const perpVelocityX = perpVelocity * perpDx;
          const perpVelocityY = perpVelocity * perpDy;
          
          // Store velocity components for visualization
          newVelocityVectors.push({
            planetId: planet.id,
            velocityX: planet.data.velocity.x,
            velocityY: planet.data.velocity.y,
            perpVelocityX,
            perpVelocityY,
            radialVelocityX,
            radialVelocityY
          });
        }

        // Calculate gravitational forces from all other planets
        let totalForceX = 0;
        let totalForceY = 0;

        prevItems.forEach(otherItem => {
          if (otherItem.id === planet.id || otherItem.type !== 'planet') return;

          // Calculate distance between planets
          const dx = otherItem.x - planet.x;
          const dy = otherItem.y - planet.y;
          const distanceSquared = dx * dx + dy * dy;
          
          // Avoid division by zero and limit extreme forces at very close distances
          if (distanceSquared < 100) return;
          
          // Calculate gravitational force
          const force = G * planet.data.mass * otherItem.data.mass / distanceSquared;
          
          // Calculate force components
          const distance = Math.sqrt(distanceSquared);
          const forceX = force * dx / distance;
          const forceY = force * dy / distance;
          
          // Store each individual force vector for visualization
          newDetailedForceVectors.push({
            targetPlanetId: planet.id,
            sourcePlanetId: otherItem.id,
            forceX: forceX,
            forceY: forceY
          });
          
          totalForceX += forceX;
          totalForceY += forceY;
        });

        // Calculate acceleration (F = ma, so a = F/m)
        const accelerationX = totalForceX / planet.data.mass;
        const accelerationY = totalForceY / planet.data.mass;

        // Update velocity
        planet.data.velocity.x += accelerationX * deltaTime;
        planet.data.velocity.y += accelerationY * deltaTime;

        // Update position
        planet.x += planet.data.velocity.x * deltaTime;
        planet.y += planet.data.velocity.y * deltaTime;

        return planet;
      });

      // Calculate new force lines for visualization
      calculateForceLines(updatedItems);

      // After all calculations are done, update detailed force and velocity vectors
      setTimeout(() => {
        setDetailedForceVectors(newDetailedForceVectors);
        setVelocityVectors(newVelocityVectors);
      }, 0);

      return updatedItems;
    });
    
    // Continue animation loop
    animationFrameId.current = requestAnimationFrame(updatePlanetPositions);
  }, [items.length, G, calculateForceLines, setFps]);

  // Start physics simulation
  useEffect(() => {
    // Initialize the animation loop
    lastUpdateTime.current = Date.now();
    animationFrameId.current = requestAnimationFrame(updatePlanetPositions);

    // Cleanup when component unmounts
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [updatePlanetPositions]);

  // Add a demo planet (Earth) when component loads if there are no items
  useEffect(() => {
    if (items.length === 0) {
      const centralBody: BaseItem = {
        id: 'planet-' + Date.now().toString(),
        x: CANVAS_CENTER_X - 75, // Subtract half the width to truly center
        y: CANVAS_CENTER_Y - 75, // Subtract half the height to truly center
        width: 150,
        height: 150,
        type: 'planet',
        data: {
          name: 'Sun',
          color: '#FFA500', // Orange color for the Sun
          radius: 75,
          mass: 10000, // Much higher mass for the central body
          velocity: { x: 0, y: 0 }, // Central body stays stationary
          isOrbital: true
        }
      };
      setItems([centralBody]);
    }
  }, [items.length]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && lastMousePos.current) {
      const deltaX = e.clientX - lastMousePos.current.x;
      const deltaY = e.clientY - lastMousePos.current.y;
      onDrag(deltaX, deltaY);
    }
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  // Create a function to toggle a planet's orbit mode
  const togglePlanetOrbitalMode = useCallback((planetId: string) => {
    setItems(prevItems => {
      return prevItems.map(item => {
        if (item.id === planetId && item.type === 'planet') {
          // Toggle the isOrbital flag
          const updatedItem = {
            ...item,
            data: {
              ...item.data,
              isOrbital: !item.data.isOrbital
            }
          };

          // Recalculate velocity based on new orbital mode
          if (updatedItem.data.isOrbital && prevItems.length > 1) {
            // Assume the first planet is the central body (like the Sun)
            const centralPlanet = prevItems[0];
            
            // Calculate center points of both planets
            const centralX = centralPlanet.x + centralPlanet.width / 2;
            const centralY = centralPlanet.y + centralPlanet.height / 2;
            const planetX = updatedItem.x + updatedItem.width / 2;
            const planetY = updatedItem.y + updatedItem.height / 2;
            
            // Calculate vector from planet to central planet
            const dx = centralX - planetX;
            const dy = centralY - planetY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Normalize the vector
            const normalizedDx = dx / distance;
            const normalizedDy = dy / distance;
            
            // Calculate perpendicular vector (tangential direction)
            const perpDx = -normalizedDy;
            const perpDy = normalizedDx;
            
            // Calculate orbital velocity magnitude using v = sqrt(G*M/r)
            const velocityMagnitude = Math.sqrt(G * centralPlanet.data.mass / distance) * 0.5;
            
            // Apply the velocity in the perpendicular (tangential) direction
            updatedItem.data.velocity = {
              x: perpDx * velocityMagnitude,
              y: perpDy * velocityMagnitude
            };
          } else if (!updatedItem.data.isOrbital) {
            // If changing to random motion, give random velocity
            updatedItem.data.velocity = { 
              x: (Math.random() - 0.5) * 20, 
              y: (Math.random() - 0.5) * 20 
            };
          }
          
          return updatedItem;
        }
        return item;
      });
    });
  }, [G]);

  // Add new state for the selected planet and popover
  const [selectedPlanetId, setSelectedPlanetId] = useState<string | null>(null);

  // Add a function to handle planet clicks
  const handlePlanetClick = useCallback((e: React.MouseEvent, planetId: string) => {
    e.stopPropagation(); // Prevent canvas click from triggering
    setSelectedPlanetId(prevId => prevId === planetId ? null : planetId); // Toggle selection
  }, []);

  // Add a function to close popover when clicking outside
  const handleCanvasClick = useCallback(() => {
    setSelectedPlanetId(null);
  }, []);

  // Modify the original handleClick function to include the canvas click handler
  const handleClick = (e: React.MouseEvent) => {
    // Close any open popover when clicking on the canvas
    handleCanvasClick();

    // Original add item logic
    if (mode === 'add' && selectedItemType && mergedItemTypes[selectedItemType]) {
      // Calculate the position in the canvas coordinate system
      const rect = e.currentTarget.getBoundingClientRect();
      
      // Simple conversion from screen to canvas coordinates without involving transform
      // Just need to get position relative to canvas element and account for scale
      const x = (e.clientX - rect.left) / transform.scale;
      const y = (e.clientY - rect.top) / transform.scale;
      
      const itemType = mergedItemTypes[selectedItemType];
      
      // Center the item on the click position
      const newItem: BaseItem = {
        id: Date.now().toString(),
        x: x - itemType.defaultWidth / 2,
        y: y - itemType.defaultHeight / 2,
        width: itemType.defaultWidth,
        height: itemType.defaultHeight,
        type: selectedItemType,
        data: { 
          ...itemType.defaultData,
          velocity: { x: 0, y: 0 }, // Initialize with zero velocity
          isOrbital: true
        }
      };

      // Only calculate orbital velocity if we have at least one planet and this planet is set to orbital mode
      if (newItem.data.isOrbital && items.length > 0) {
        // Assume the first planet is the central body (like the Sun)
        const centralPlanet = items[0];
        
        // Calculate center points of both planets
        const centralX = centralPlanet.x + centralPlanet.width / 2;
        const centralY = centralPlanet.y + centralPlanet.height / 2;
        const newPlanetX = newItem.x + newItem.width / 2;
        const newPlanetY = newItem.y + newItem.height / 2;
        
        // Calculate vector from new planet to central planet
        const dx = centralX - newPlanetX;
        const dy = centralY - newPlanetY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Normalize the vector
        const normalizedDx = dx / distance;
        const normalizedDy = dy / distance;
        
        // Calculate perpendicular vector (tangential direction)
        // This is the key step: creating a vector that is exactly perpendicular 
        // to the radius vector by swapping components and negating one
        const perpDx = -normalizedDy;
        const perpDy = normalizedDx;
        
        // Calculate orbital velocity magnitude using v = sqrt(G*M/r)
        const velocityMagnitude = Math.sqrt(G * centralPlanet.data.mass / distance) * 0.5;
        
        // Apply the velocity in the perpendicular (tangential) direction
        newItem.data.velocity = {
          x: perpDx * velocityMagnitude,
          y: perpDy * velocityMagnitude
        };
      } else if (!newItem.data.isOrbital) {
        // If not in orbital mode, give random velocity as before
        newItem.data.velocity = { 
          x: (Math.random() - 0.5) * 20, 
          y: (Math.random() - 0.5) * 20 
        };
      }
      
      setItems([...items, newItem]);
    }
  };

  // Toggle force visualization - now uses the Zustand store
  const handleToggleForces = useCallback(() => {
    setShowForces(!showForces);
  }, [showForces, setShowForces]);

  // Toggle simulation - now uses the Zustand store
  const handleToggleSimulation = useCallback(() => {
    const newIsPlaying = !isSimulationRunning.current;
    isSimulationRunning.current = newIsPlaying;
    setIsPlaying(newIsPlaying);
    
    if (newIsPlaying && !animationFrameId.current) {
      lastUpdateTime.current = Date.now();
      animationFrameId.current = requestAnimationFrame(updatePlanetPositions);
    }
  }, [setIsPlaying, updatePlanetPositions]);

  // Calculate gravitational field color based on position
  const getGravityFieldColor = (x: number, y: number) => {
    if (items.length === 0) return 'rgba(0, 0, 0, 0)'; // No field if no planets
    
    let totalField = 0;
    
    items.forEach(item => {
      if (item.type !== 'planet') return;
      
      // Calculate distance to this point
      const dx = x - (item.x + item.width/2);
      const dy = y - (item.y + item.height/2);
      const distanceSquared = dx * dx + dy * dy;
      
      if (distanceSquared < 1) return; // Avoid infinity
      
      // Field strength proportional to mass, inversely proportional to distance squared
      const fieldStrength = item.data.mass / distanceSquared;
      totalField += fieldStrength;
    });
    
    // Normalize the field (log scale works better for visualization)
    const normalizedField = Math.min(1, Math.log(totalField + 1) / 10);
    
    // Scale from blue (weak) to red (strong)
    const r = Math.round(normalizedField * 255);
    const g = 0;
    const b = Math.round((1 - normalizedField) * 255);
    const a = normalizedField * 0.3; // Semi-transparent
    
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  };

  return (
    <div
      style={{
        position: 'absolute',
        width: `${CANVAS_WIDTH}px`,
        height: `${CANVAS_HEIGHT}px`,
        transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
        transformOrigin: '0 0',
      }}
    >
      {/* Background Layer */}
      <CanvasBackground 
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        cursor={isDragging ? 'grabbing' : mode === 'add' ? 'crosshair' : 'default'}
      />
      
      {/* Orbit Path Layer (z-index: 10) */}
      <OrbitPathVisualization
        canvasWidth={CANVAS_WIDTH}
        canvasHeight={CANVAS_HEIGHT}
        items={items}
        orbitPaths={orbitPaths}
        showOrbits={showOrbits}
      />
      
      {/* Force Line Layer (z-index: 20) */}
      <ForceLineLayer
        canvasWidth={CANVAS_WIDTH}
        canvasHeight={CANVAS_HEIGHT}
        forceLines={forceLines}
        showForces={showForces}
      />

      {/* Force Vector Layer (z-index: 101-102) */}
      <ForceVisualization
        canvasWidth={CANVAS_WIDTH}
        canvasHeight={CANVAS_HEIGHT}
        items={items}
        detailedForceVectors={detailedForceVectors}
        velocityVectors={velocityVectors}
        showForces={showForces}
      />

      {/* Planet Layer (z-index varies, content is interactive) */}
      <PlanetLayer
        items={items}
        mergedItemTypes={mergedItemTypes}
        selectedPlanetId={selectedPlanetId}
        setSelectedPlanetId={setSelectedPlanetId}
        togglePlanetOrbitalMode={togglePlanetOrbitalMode}
        handlePlanetClick={handlePlanetClick}
      />
    </div>
  );
}; 