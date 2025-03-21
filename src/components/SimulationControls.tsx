import React from 'react';
import { useSimulationStore } from '../store/simulationStore';

export const SimulationControls: React.FC = () => {
  const { 
    isPlaying, 
    showForces, 
    showOrbits,
    fps, 
    togglePlaying, 
    toggleShowForces,
    toggleShowOrbits
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