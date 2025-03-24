import React, { useState, useEffect, useRef } from 'react';
import { useSimulationStore } from '../store/simulationStore';

interface CommandOption {
  id: string;
  label: string;
  shortcut?: string;
  action: () => void;
}

interface CommandPaletteProps {
  onCenterView?: () => void;
  mode?: 'pan' | 'add';
  toggleMode?: () => void;
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ 
  onCenterView,
  mode = 'add',
  toggleMode
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const paletteRef = useRef<HTMLDivElement>(null);
  
  const {
    isPlaying,
    togglePlaying,
    showForces,
    toggleShowForces,
    showOrbits,
    toggleShowOrbits,
    planetaryForces,
    togglePlanetaryForces,
    timeScale,
    setTimeScale
  } = useSimulationStore();

  // Define available commands
  const commands: CommandOption[] = [
    {
      id: 'toggle-play',
      label: isPlaying ? 'Pause Simulation' : 'Play Simulation',
      shortcut: 'P',
      action: togglePlaying
    },
    {
      id: 'toggle-forces',
      label: showForces ? 'Hide Forces' : 'Show Forces',
      shortcut: 'F',
      action: toggleShowForces
    },
    {
      id: 'toggle-orbits',
      label: showOrbits ? 'Hide Orbits' : 'Show Orbits',
      shortcut: 'O',
      action: toggleShowOrbits
    },
    {
      id: 'toggle-planetary-forces',
      label: planetaryForces ? 'Disable Planet-Planet Forces' : 'Enable Planet-Planet Forces',
      shortcut: 'G',
      action: togglePlanetaryForces
    },
    {
      id: 'speed-normal',
      label: 'Normal Speed (1x)',
      shortcut: '1',
      action: () => setTimeScale(1)
    },
    {
      id: 'speed-up',
      label: 'Faster Speed (2x)',
      shortcut: '2',
      action: () => setTimeScale(2)
    },
    {
      id: 'speed-fast',
      label: 'Very Fast Speed (5x)',
      shortcut: '5',
      action: () => setTimeScale(5)
    },
    {
      id: 'speed-slow',
      label: 'Slow Speed (0.5x)',
      shortcut: 'S',
      action: () => setTimeScale(0.5)
    }
  ];

  // Add center view command if the prop is provided
  if (onCenterView) {
    commands.push({
      id: 'center-view',
      label: 'Center View',
      shortcut: 'C',
      action: onCenterView
    });
  }

  // Add toggle mode command if the prop is provided
  if (toggleMode) {
    commands.push({
      id: 'toggle-mode',
      label: mode === 'pan' ? 'Switch to Add Mode' : 'Switch to Pan Mode',
      shortcut: 'M',
      action: toggleMode
    });
  }

  // Filter commands based on search term
  const filteredCommands = commands.filter(command => 
    command.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Open command palette with Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 10);
      }
      
      // Close on Escape key
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
      
      // Handle keyboard shortcuts when palette is closed
      if (!isOpen) {
        commands.forEach(command => {
          if (command.shortcut && e.key.toLowerCase() === command.shortcut.toLowerCase()) {
            command.action();
          }
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, commands]);

  // Close palette when clicking outside of it
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (paletteRef.current && !paletteRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  if (!isOpen) {
    return (
      <div
        className="command-palette-trigger"
        style={{
          position: 'absolute',
          bottom: '20px',
          right: '20px',
          backgroundColor: 'rgba(30, 30, 40, 0.8)',
          color: 'white',
          padding: '8px 12px',
          borderRadius: '8px',
          cursor: 'pointer',
          zIndex: 1000,
          fontSize: '14px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
          userSelect: 'none'
        }}
        onClick={() => {
          setIsOpen(true);
          setTimeout(() => inputRef.current?.focus(), 10);
        }}
      >
        ⌘K - Commands
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
      }}
    >
      <div
        ref={paletteRef}
        style={{
          width: '500px',
          maxWidth: '90%',
          backgroundColor: '#1e1e2e',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.4)',
        }}
      >
        <div
          style={{
            padding: '16px',
            borderBottom: '1px solid #333',
          }}
        >
          <input
            ref={inputRef}
            type="text"
            placeholder="Search commands..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#2d2d3f',
              border: 'none',
              borderRadius: '6px',
              color: 'white',
              fontSize: '16px',
              outline: 'none',
            }}
          />
        </div>
        <div
          style={{
            maxHeight: '300px',
            overflowY: 'auto',
          }}
        >
          {filteredCommands.map((command) => (
            <div
              key={command.id}
              onClick={() => {
                command.action();
                setIsOpen(false);
              }}
              style={{
                padding: '12px 16px',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid #333',
                transition: 'background-color 0.15s ease',
                color: 'white'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#2d2d3f';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <span style={{ fontWeight: 500 }}>{command.label}</span>
              {command.shortcut && (
                <span
                  style={{
                    padding: '3px 6px',
                    backgroundColor: '#3d3d4f',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    color: '#ccc',
                  }}
                >
                  {command.shortcut}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CommandPalette; 