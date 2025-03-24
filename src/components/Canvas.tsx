import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSimulationStore } from '../store/simulationStore';
import { calculateOrbitPath } from './calculateOrbitPath';
import ForceVisualization, { ForceVector, VelocityVector } from './ForceVisualization';
import { PlanetItemType } from './ItemTypes/PlanetItemType';
import CanvasBackground from './layers/CanvasBackground';
import ForceLineLayer from './layers/ForceLineLayer';
import PlanetLayer from './layers/PlanetLayer';
import OrbitLogger from './OrbitLogger';
import OrbitPathVisualization, { OrbitPath } from './OrbitPathVisualization';

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
  onZoom: (newTransform: { x: number; y: number; scale: number }) => void;
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
  onZoom,
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
  const [isLocalDragging, setIsLocalDragging] = useState(false);
  const frameCount = useRef<number>(0);
  const lastFpsUpdate = useRef<number>(Date.now());
  
  // Get global simulation state from store
  const {
    isPlaying,
    showForces,
    showOrbits,
    showTrails,
    fps,
    planetaryForces,
    timeScale,
    togglePlaying,
    toggleShowForces,
    toggleShowOrbits,
    setFps,
    G,
  } = useSimulationStore();

  // Reference to track if simulation is running
  const isSimulationRunning = useRef(isPlaying);

  // Update reference when isPlaying changes
  useEffect(() => {
    isSimulationRunning.current = isPlaying;
  }, [isPlaying]);

  // Merge custom item types with default ones
  const mergedItemTypes: Record<string, ItemTypeConfig> = {
    planet: PlanetItemType,
    ...itemTypes
  };

  // Initialize the component
  useEffect(() => {
    if (!isInitialized.current && onInitialize) {
      onInitialize();
      isInitialized.current = true;
    }
  }, [onInitialize]);

  // Handle mouse down event
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (mode === 'pan' || e.buttons === 2 || e.altKey) { // Middle button or right button or Alt key
      setIsLocalDragging(true);
      lastMousePos.current = { x: e.clientX, y: e.clientY };
      e.preventDefault();
    }
  }, [mode]);

  // Handle mouse up event
  const handleMouseUp = useCallback(() => {
    setIsLocalDragging(false);
  }, []);

  // Handle mouse move event
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if ((isLocalDragging || isDragging) && lastMousePos.current) {
      const deltaX = e.clientX - lastMousePos.current.x;
      const deltaY = e.clientY - lastMousePos.current.y;
      onDrag(deltaX, deltaY);
    }
    
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  }, [isDragging, isLocalDragging, onDrag]);

  // Setup global mouse event listeners
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsLocalDragging(false);
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, []);

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
      // Use the new utility function with planetaryForces parameter
      const orbitPoints = calculateOrbitPath(planet, planetItems, G, planetaryForces);
      if (orbitPoints.length > 0) {
        newOrbitPaths.push({
          planetId: planet.id,
          points: orbitPoints,
          color: planet.data.color || 'white'
        });
      }
    });
    
    setOrbitPaths(newOrbitPaths);
  }, [items, G, showOrbits, planetaryForces]);
  
  // Update orbit paths whenever planets move or planetaryForces changes
  useEffect(() => {
    calculateAllOrbitPaths();
  }, [calculateAllOrbitPaths, items.length, planetaryForces]);
  
  // Replace the single force vector state with a more detailed structure
  const [detailedForceVectors, setDetailedForceVectors] = useState<ForceVector[]>([]);
  const [velocityVectors, setVelocityVectors] = useState<VelocityVector[]>([]);

  // Update the updatePlanetPositions function to respect the planetaryForces setting
  const updatePlanetPositions = useCallback(() => {
    const currentTime = Date.now();
    const deltaTime = (currentTime - lastUpdateTime.current) / 1000; // Convert to seconds
    lastUpdateTime.current = currentTime;

    // Apply time scale to deltaTime
    const scaledDeltaTime = deltaTime * timeScale;

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
            // Calculate center points
            const centralPlanet = prevItems[0];
            
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

          // Get the central planet
          const centralPlanet = prevItems[0]; 
          const isCentralPlanet = otherItem.id === centralPlanet.id;
          
          // Skip force calculation from other planets if planetary forces are disabled
          // Only calculate forces from the central body in that case
          if (!planetaryForces && !isCentralPlanet) return;

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
        planet.data.velocity.x += accelerationX * scaledDeltaTime;
        planet.data.velocity.y += accelerationY * scaledDeltaTime;

        // Update position
        planet.x += planet.data.velocity.x * scaledDeltaTime;
        planet.y += planet.data.velocity.y * scaledDeltaTime;

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
  }, [items.length, G, calculateForceLines, setFps, planetaryForces, timeScale]);

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
          mass: 1000000, // Much higher mass for the central body
          velocity: { x: 0, y: 0 }, // Central body stays stationary
          isOrbital: true
        }
      };
      setItems([centralBody]);
    }
  }, [items.length]);

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
        const velocityMagnitude = Math.sqrt(G * centralPlanet.data.mass / distance);
        
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
    toggleShowForces();
  }, [toggleShowForces]);

  // Toggle simulation - now uses the Zustand store
  const handleToggleSimulation = useCallback(() => {
    togglePlaying();
  }, [togglePlaying]);

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

  // Add a function to handle planet clicks
  const handlePlanetClick = useCallback((e: React.MouseEvent, planetId: string) => {
    e.stopPropagation(); // Prevent canvas click from triggering
    setSelectedPlanetId(prevId => prevId === planetId ? null : planetId); // Toggle selection
  }, []);

  // Add a function to close popover when clicking outside
  const handleCanvasClick = useCallback(() => {
    setSelectedPlanetId(null);
  }, []);

  // Add new state for the selected planet and popover
  const [selectedPlanetId, setSelectedPlanetId] = useState<string | null>(null);

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
            const velocityMagnitude = Math.sqrt(G * centralPlanet.data.mass / distance);
            
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

  // Add wheel event handler to zoom in/out
  const handleWheel = useCallback((e: React.WheelEvent) => {
    // Only handle zooming if in pan mode or if Alt key is pressed
    if (mode === 'pan' || e.altKey) {
      e.preventDefault();
      
      // Calculate the cursor position relative to the canvas
      const canvasRect = e.currentTarget.getBoundingClientRect();
      
      // Position of cursor in screen coordinates
      const cursorScreenX = e.clientX;
      const cursorScreenY = e.clientY;
      
      // Position of cursor relative to the canvas element
      const cursorCanvasX = Math.abs(cursorScreenX - canvasRect.left);
      const cursorCanvasY = Math.abs(cursorScreenY - canvasRect.top);
      
      // Convert cursor position to world coordinates (before zoom change)
      const cursorWorldX = (cursorCanvasX / transform.scale);
      const cursorWorldY = (cursorCanvasY / transform.scale);
      
      // Calculate new scale - with smaller zoom factor for smoother experience
      const scaleFactor = 0.1;
      const delta = e.deltaY > 0 ? -scaleFactor : scaleFactor;
      const newScale = Math.max(0.1, Math.min(5, transform.scale * (1 + delta)));
      
      // Calculate new transform that keeps the point under the cursor fixed
      const newTransform = {
        x: cursorScreenX - cursorWorldX * newScale,
        y: cursorScreenY - cursorWorldY * newScale,
        scale: newScale
      };
      
      // Update transform
      onZoom(newTransform);
    }
  }, [mode, transform, onZoom]);

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
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        cursor={isLocalDragging || isDragging ? 'grabbing' : 
               mode === 'pan' ? 'grab' : 
               mode === 'add' ? 'crosshair' : 'default'}
      />
      
      {/* Orbit Path Layer (z-index: 10) */}
      <OrbitPathVisualization
        canvasWidth={CANVAS_WIDTH}
        canvasHeight={CANVAS_HEIGHT}
        items={items}
        orbitPaths={orbitPaths}
        showOrbits={showOrbits}
      />


      {/* Orbit Logger Layer (z-index: 10) */}
      <OrbitLogger
        items={items}
        isPlaying={isPlaying}
        maxPointsPerOrbit={100}
        loggingFrequency={500}
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