import React, { useState, useEffect } from 'react';
import { Canvas, calculateCenteredTransform } from './components/Canvas';
import { SimulationControls } from './components/SimulationControls';
import { useSimulationStore } from './store/simulationStore';
import CommandPalette from './components/CommandPalette';

const App: React.FC = () => {
  const [mode, setMode] = useState<'pan' | 'add'>('add');
  const [tempPanMode, setTempPanMode] = useState(false);
  const [isDragging, setIsLocalDragging] = useState(false);
  const [transform, setTransform] = useState(calculateCenteredTransform());
  const [selectedItemType, setSelectedItemType] = useState<string>('planet');
  const [spacebarPressed, setSpacebarPressed] = useState(false);
  
  const { togglePlaying } = useSimulationStore();
  
  // Handle center view functionality
  const handleCenterView = () => {
    setTransform(calculateCenteredTransform());
  };

  // Handle drag function for the canvas
  const handleDrag = (deltaX: number, deltaY: number) => {
    setTransform(prev => ({
      ...prev,
      x: prev.x + deltaX,
      y: prev.y + deltaY
    }));
  };

  // Handle zoom function for the canvas
  const handleZoom = (newTransform: { x: number; y: number; scale: number }) => {
    setTransform(newTransform);
  };

  // Toggle between pan and add modes
  const toggleMode = () => {
    setMode(prevMode => prevMode === 'pan' ? 'add' : 'pan');
  };

  // Handle spacebar press for toggling play/pause and temporary pan mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        if (!spacebarPressed) {
          setSpacebarPressed(true);
          
          // If Shift+Space is pressed, toggle play/pause
          if (e.shiftKey) {
            togglePlaying();
          } else {
            // Otherwise, enable temporary pan mode
            setTempPanMode(true);
          }
        }
        // Prevent page scrolling when space is pressed
        e.preventDefault();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setSpacebarPressed(false);
        // Disable temporary pan mode when space is released
        setTempPanMode(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [togglePlaying, spacebarPressed]);

  // Setup wheel event handling for zooming throughout the window
  useEffect(() => {
    const handleGlobalWheel = (e: WheelEvent) => {
      // Prevent default scroll behavior on the page when in pan mode
      if (mode === 'pan' || tempPanMode || e.altKey) {
        e.preventDefault();
      }
    };

    // Add the event listener with passive: false to allow preventDefault
    window.addEventListener('wheel', handleGlobalWheel, { passive: false });
    
    return () => {
      window.removeEventListener('wheel', handleGlobalWheel);
    };
  }, [mode, tempPanMode]);

  // Determine effective mode (considering temporary pan mode)
  const effectiveMode = tempPanMode ? 'pan' : mode;

  return (
    <div style={{ height: '100vh', width: '100vw', position: 'relative', overflow: 'hidden' }}>
      {/* Mode Toggle Button - Top Right */}
      <div style={{
        position: 'fixed',
        top: 20,
        right: 20,
        zIndex: 1000,
        display: 'flex',
        gap: '10px'
      }}>
        <button
          onClick={toggleMode}
          style={{
            background: mode === 'pan' ? '#2196F3' : '#9C27B0',
            color: 'white',
            border: 'none',
            padding: '8px 15px',
            borderRadius: '4px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            fontSize: '14px',
            fontWeight: 'bold',
            boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
          }}
        >
          {mode === 'pan' ? '🖐️ Pan Mode' : '✏️ Add Mode'}
        </button>
        <div style={{
          background: 'rgba(30, 30, 40, 0.8)',
          padding: '8px 12px',
          borderRadius: '4px',
          color: 'white',
          fontSize: '14px',
          boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
        }}>
          {mode === 'pan' ? 'Scroll to zoom in/out' : 'Press Space to pan, Alt+Scroll to zoom'}
        </div>
      </div>

      <Canvas 
        mode={effectiveMode}
        transform={transform}
        onDrag={handleDrag}
        onZoom={handleZoom}
        isDragging={isDragging}
        selectedItemType={selectedItemType}
      />
      <SimulationControls onCenterView={handleCenterView} />
      <CommandPalette 
        onCenterView={handleCenterView} 
        mode={mode}
        toggleMode={toggleMode}
      />
    </div>
  );
}

export default App;
