import React, { useRef, useState, useEffect, useCallback } from 'react';
import { PlanetItemType } from './ItemTypes/PlanetItemType';
import { useSimulationStore } from '../store/simulationStore';

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
  const lastMousePos = useRef<{ x: number; y: number } | null>(null);
  const isInitialized = useRef(false);
  const animationFrameId = useRef<number | null>(null);
  const lastUpdateTime = useRef<number>(Date.now());
  
  // Get simulation state from Zustand store
  const { isPlaying, showForces, setFps, setIsPlaying, setShowForces } = useSimulationStore();
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
  
  // Physics simulation for planetary motion
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

    // Only update if we have more than one item or simulation is running
    if (items.length <= 1 || !isSimulationRunning.current) {
      animationFrameId.current = requestAnimationFrame(updatePlanetPositions);
      return;
    }

    setItems(prevItems => {
      const updatedItems = prevItems.map(item => {
        // Only apply physics to planets
        if (item.type !== 'planet') return item;

        const planet = { ...item };
        if (!planet.data.velocity) {
          planet.data.velocity = { x: 0, y: 0 };
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
          totalForceX += force * dx / distance;
          totalForceY += force * dy / distance;
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
      const earthPlanet: BaseItem = {
        id: 'planet-' + Date.now().toString(),
        x: CANVAS_CENTER_X - 60, // Subtract half the width to truly center
        y: CANVAS_CENTER_Y - 60, // Subtract half the height to truly center
        width: 120,
        height: 120,
        type: 'planet',
        data: {
          name: 'Biggest Planet',
          color: '#1E88E5', // Blue color for Earth
          radius: 60,
          mass: 5000, // Earth has significant mass
          velocity: { x: 0, y: 0 } // Stationary at first
        }
      };
      setItems([earthPlanet]);
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

  const handleClick = (e: React.MouseEvent) => {
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
          // Give smaller planets some initial velocity for interesting orbits
          velocity: { 
            x: (Math.random() - 0.5) * 20, 
            y: (Math.random() - 0.5) * 20 
          }
        }
      };
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
        backgroundColor: '#0a0a18', // Dark blue background like space
        backgroundImage: 'radial-gradient(white, rgba(255,255,255,.2) 2px, transparent 7px)', 
        backgroundSize: '100px 100px', // Stars in background
        cursor: isDragging ? 'grabbing' : mode === 'add' ? 'crosshair' : 'default'
      }}
      onMouseMove={handleMouseMove}
      onClick={handleClick}
    >
      {/* Gravity field visualization (commented out because it's very performance intensive) */}
      {/* Uncomment this if you want to see a color visualization of the gravity field 
      {showForces && items.length > 0 && Array.from({ length: 50 }).map((_, i) => (
        <div key={`field-row-${i}`} style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', display: 'flex' }}>
          {Array.from({ length: 50 }).map((_, j) => {
            const x = j * (CANVAS_WIDTH / 50);
            const y = i * (CANVAS_HEIGHT / 50);
            return (
              <div 
                key={`field-${i}-${j}`} 
                style={{
                  width: `${CANVAS_WIDTH / 50}px`,
                  height: `${CANVAS_HEIGHT / 50}px`,
                  backgroundColor: getGravityFieldColor(x, y)
                }}
              />
            );
          })}
        </div>
      ))} */}

      {/* Force line visualization */}
      {showForces && forceLines.map((line, index) => {
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
            width: `${CANVAS_WIDTH}px`,
            height: `${CANVAS_HEIGHT}px`,
            pointerEvents: 'none'
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

      {/* Planet items */}
      {items.map((item) => (
        <div
          key={item.id}
          style={{
            position: 'absolute',
            left: item.x,
            top: item.y,
            width: item.width,
            height: item.height,
            borderRadius: '4px',
          }}
        >
          {mergedItemTypes[item.type] ? 
            mergedItemTypes[item.type].render(item) : null}
        </div>
      ))}
    </div>
  );
}; 