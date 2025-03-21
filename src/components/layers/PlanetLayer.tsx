import React from 'react';
import { BaseItem, ItemTypeConfig } from '../Canvas';
import PlanetPropertiesPopover from '../PlanetPropertiesPopover';

interface PlanetLayerProps {
  items: BaseItem[];
  mergedItemTypes: Record<string, ItemTypeConfig>;
  selectedPlanetId: string | null;
  setSelectedPlanetId: (id: string | null) => void;
  togglePlanetOrbitalMode: (planetId: string) => void;
  handlePlanetClick: (e: React.MouseEvent, planetId: string) => void;
}

const PlanetLayer: React.FC<PlanetLayerProps> = ({
  items,
  mergedItemTypes,
  selectedPlanetId,
  setSelectedPlanetId,
  togglePlanetOrbitalMode,
  handlePlanetClick
}) => {
  return (
    <>
      {items.map((item, index) => {
        // Check if item is a planet
        const isPlanet = item.type === 'planet';
        const isCentralBody = isPlanet && index === 0; // Assuming first planet is the central body
        
        return (
          <div
            key={item.id}
            style={{
              position: 'absolute',
              left: item.x,
              top: item.y,
              width: item.width,
              height: item.height,
              borderRadius: '4px',
              zIndex: isCentralBody ? 50 : 70, // Central body below other planets
            }}
          >
            <div 
              onClick={(e) => handlePlanetClick(e, item.id)}
              style={{ cursor: 'pointer', width: '100%', height: '100%' }}
            >
              {mergedItemTypes[item.type] ? 
                mergedItemTypes[item.type].render(item) : null}
            </div>
            
            {/* Orbit mode toggle button for planets except the central body */}
            {isPlanet && !isCentralBody && (
              <div 
                style={{
                  position: 'absolute',
                  bottom: -25,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: item.data.isOrbital ? '#9C27B0' : '#607D8B',
                  color: 'white',
                  padding: '2px 5px',
                  borderRadius: '3px',
                  fontSize: '10px',
                  cursor: 'pointer',
                  zIndex: 100
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlanetOrbitalMode(item.id);
                }}
              >
                {item.data.isOrbital ? 'Orbital' : 'Random'}
              </div>
            )}
            
            {/* Display a "Sun" label for the central body */}
            {isCentralBody && (
              <div 
                style={{
                  position: 'absolute',
                  bottom: -25,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: 'rgba(255, 165, 0, 0.8)',
                  color: 'white',
                  padding: '2px 5px',
                  borderRadius: '3px',
                  fontSize: '10px',
                  zIndex: 100
                }}
              >
                Central Body
              </div>
            )}
            
            {/* Planet Properties Popover */}
            {selectedPlanetId === item.id && isPlanet && (
              <PlanetPropertiesPopover 
                planet={item}
                onClose={() => setSelectedPlanetId(null)}
                onToggleOrbitalMode={togglePlanetOrbitalMode}
              />
            )}
          </div>
        );
      })}
    </>
  );
};

export default PlanetLayer; 