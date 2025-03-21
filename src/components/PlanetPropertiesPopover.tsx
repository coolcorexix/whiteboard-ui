import React from 'react';
import { BaseItem } from './Canvas';

interface PlanetPropertiesPopoverProps {
  planet: BaseItem;
  onClose: () => void;
  onToggleOrbitalMode: (planetId: string) => void;
}

const PlanetPropertiesPopover: React.FC<PlanetPropertiesPopoverProps> = ({
  planet,
  onClose,
  onToggleOrbitalMode
}) => {
  return (
    <div 
      style={{
        position: 'absolute',
        top: -150,
        left: planet.width / 2,
        transform: 'translateX(-50%)',
        backgroundColor: 'rgba(20, 20, 30, 0.9)',
        border: `2px solid ${planet.data.color}`,
        borderRadius: '8px',
        padding: '12px',
        minWidth: '200px',
        color: 'white',
        zIndex: 200,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(5px)'
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={{ 
        borderBottom: '1px solid rgba(255, 255, 255, 0.2)', 
        paddingBottom: '8px', 
        marginBottom: '8px',
        fontWeight: 'bold',
        fontSize: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <span>{planet.data.name}</span>
        <div 
          style={{ 
            width: '16px', 
            height: '16px', 
            borderRadius: '50%', 
            backgroundColor: planet.data.color,
            marginLeft: '10px'
          }}
        />
      </div>
      
      <table style={{ width: '100%', borderSpacing: '0 4px' }}>
        <tbody>
          <tr>
            <td style={{ opacity: 0.7 }}>Mass:</td>
            <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{planet.data.mass.toLocaleString()}</td>
          </tr>
          <tr>
            <td style={{ opacity: 0.7 }}>Radius:</td>
            <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{planet.data.radius}</td>
          </tr>
          <tr>
            <td style={{ opacity: 0.7 }}>Position:</td>
            <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>
              x: {Math.round(planet.x)}<br />
              y: {Math.round(planet.y)}
            </td>
          </tr>
          <tr>
            <td style={{ opacity: 0.7 }}>Velocity:</td>
            <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>
              x: {planet.data.velocity.x.toFixed(2)}<br />
              y: {planet.data.velocity.y.toFixed(2)}
            </td>
          </tr>
          <tr>
            <td style={{ opacity: 0.7 }}>Type:</td>
            <td style={{ textAlign: 'right' }}>{planet.data.isOrbital ? 'Orbital' : 'Random'}</td>
          </tr>
        </tbody>
      </table>
      
      <div style={{ 
        marginTop: '10px', 
        display: 'flex', 
        justifyContent: 'flex-end',
        gap: '6px'
      }}>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onToggleOrbitalMode(planet.id);
          }}
          style={{
            backgroundColor: planet.data.isOrbital ? '#9C27B0' : '#607D8B',
            color: 'white',
            border: 'none',
            padding: '4px 8px',
            borderRadius: '3px',
            fontSize: '12px',
            cursor: 'pointer'
          }}
        >
          {planet.data.isOrbital ? 'Switch to Random' : 'Switch to Orbital'}
        </button>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          style={{
            backgroundColor: '#444',
            color: 'white',
            border: 'none',
            padding: '4px 8px',
            borderRadius: '3px',
            fontSize: '12px',
            cursor: 'pointer'
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default PlanetPropertiesPopover; 