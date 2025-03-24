import React from 'react';
import { useSimulationStore } from '../store/simulationStore';
import { calculateCenteredTransform } from './Canvas';

interface SimulationControlsProps {
  onCenterView?: () => void;
}

export const SimulationControls: React.FC<SimulationControlsProps> = ({ onCenterView }) => {
  const { 
    isPlaying, 
    showForces, 
    showOrbits,
    planetaryForces,
    timeScale,
    fps, 
    togglePlaying, 
    toggleShowForces,
    toggleShowOrbits,
    togglePlanetaryForces,
    setTimeScale
  } = useSimulationStore();

  return (
    <div style={{ 
      position: 'fixed', 
      bottom: 20, 
      left: 20, 
      backgroundColor: 'rgba(30, 30, 40, 0.8)',
      padding: '10px',
      borderRadius: '8px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
      zIndex: 1000,
      display: 'flex',
      gap: '10px',
      alignItems: 'center'
    }}>
      <button 
        onClick={togglePlaying}
        style={{
          background: isPlaying ? '#f44336' : '#4CAF50',
          color: 'white',
          border: 'none',
          padding: '5px 10px',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '14px'
        }}
      >
        {isPlaying ? 'Pause' : 'Play'}
      </button>
      
      <button 
        onClick={toggleShowForces}
        style={{
          background: showForces ? '#2196F3' : '#607D8B',
          color: 'white',
          border: 'none',
          padding: '5px 10px',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '14px'
        }}
      >
        {showForces ? 'Hide Forces' : 'Show Forces'}
      </button>

      <button 
        onClick={toggleShowOrbits}
        style={{
          background: showOrbits ? '#FF9800' : '#607D8B',
          color: 'white',
          border: 'none',
          padding: '5px 10px',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '14px'
        }}
      >
        {showOrbits ? 'Hide Orbits' : 'Show Orbits'}
      </button>

      <button 
        onClick={togglePlanetaryForces}
        style={{
          background: planetaryForces ? '#9C27B0' : '#607D8B',
          color: 'white',
          border: 'none',
          padding: '5px 10px',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '14px'
        }}
      >
        {planetaryForces ? 'Disable P-P Forces' : 'Enable P-P Forces'}
      </button>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
        <span style={{ color: 'white', fontSize: '14px' }}>Speed:</span>
        <button
          onClick={() => setTimeScale(0.25)}
          style={{
            background: timeScale === 0.25 ? '#9C27B0' : '#607D8B',
            color: 'white',
            border: 'none',
            padding: '3px 6px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          0.25x
        </button>
        <button
          onClick={() => setTimeScale(0.5)}
          style={{
            background: timeScale === 0.5 ? '#9C27B0' : '#607D8B',
            color: 'white',
            border: 'none',
            padding: '3px 6px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          0.5x
        </button>
        <button
          onClick={() => setTimeScale(1)}
          style={{
            background: timeScale === 1 ? '#9C27B0' : '#607D8B',
            color: 'white',
            border: 'none',
            padding: '3px 6px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          1x
        </button>
        <button
          onClick={() => setTimeScale(2)}
          style={{
            background: timeScale === 2 ? '#9C27B0' : '#607D8B',
            color: 'white',
            border: 'none',
            padding: '3px 6px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          2x
        </button>
        <button
          onClick={() => setTimeScale(4)}
          style={{
            background: timeScale === 4 ? '#9C27B0' : '#607D8B',
            color: 'white',
            border: 'none',
            padding: '3px 6px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          4x
        </button>
      </div>

      <button 
        onClick={onCenterView}
        style={{
          background: '#2196F3',
          color: 'white',
          border: 'none',
          padding: '5px 10px',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '14px'
        }}
      >
        Center View
      </button>

      {/* FPS Monitor */}
      <div style={{
        background: 'rgba(0,0,0,0.7)',
        color: fps > 50 ? '#4CAF50' : fps > 30 ? '#FF9800' : '#f44336',
        padding: '5px 10px',
        borderRadius: '4px',
        fontSize: '14px',
        fontFamily: 'monospace',
        display: 'flex',
        alignItems: 'center'
      }}>
        <span style={{ marginRight: '5px' }}>FPS:</span>
        <span style={{ fontWeight: 'bold' }}>{fps}</span>
      </div>
    </div>
  );
}; 