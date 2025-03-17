import React from 'react';

interface CommandPaletteProps {
  mode: 'pan' | 'add';
  onModeChange: (mode: 'pan' | 'add') => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ mode, onModeChange }) => {
  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        backgroundColor: 'white',
        padding: '10px',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        zIndex: 1000
      }}
    >
      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          style={{
            padding: '8px 16px',
            borderRadius: '4px',
            border: 'none',
            backgroundColor: mode === 'pan' ? '#007AFF' : '#E5E5E5',
            color: mode === 'pan' ? 'white' : 'black',
            cursor: 'pointer',
            fontWeight: 500
          }}
          onClick={() => onModeChange('pan')}
        >
          🖐 Pan
        </button>
        <button
          style={{
            padding: '8px 16px',
            borderRadius: '4px',
            border: 'none',
            backgroundColor: mode === 'add' ? '#007AFF' : '#E5E5E5',
            color: mode === 'add' ? 'white' : 'black',
            cursor: 'pointer',
            fontWeight: 500
          }}
          onClick={() => onModeChange('add')}
        >
          ➕ Add
        </button>
      </div>
    </div>
  );
}; 