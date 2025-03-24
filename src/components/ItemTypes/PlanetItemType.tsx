import React from 'react';
import { BaseItem, ItemTypeConfig } from '../Canvas';

// Planet-specific data interface
export interface PlanetData {
  name: string;
  color: string;
  radius: number;
  mass: number;  // Mass affects gravitational pull
  velocity?: { x: number; y: number }; // Optional initial velocity
  isOrbital: boolean; // Whether this planet follows orbital rules
}

// Planet-specific item interface
export interface PlanetItem extends BaseItem {
  data: PlanetData;
}

// Random color generator for planets
const getRandomColor = (): string => {
  return '#' + Math.floor(Math.random()*16777215).toString(16);
};

// Helper to generate random mass based on radius
const calculateMassFromRadius = (radius: number): number => {
  // Simplified mass calculation (assumes uniform density)
  // Mass = Volume * Density, where Volume = 4/3 * π * r³
  // Using a simplified formula here with an arbitrary density factor
  return Math.round(Math.pow(radius, 3) * 0.01);
};

// Planet item type configuration
export const PlanetItemType: ItemTypeConfig = {
  defaultWidth: 60,
  defaultHeight: 60,
  defaultData: {
    name: 'Small Planet',
    color: getRandomColor(),
    radius: 30,
    mass: 1, // Smaller mass for satellites orbiting the central body
    velocity: { x: 0, y: 0 }, // Initial velocity will be set in Canvas component
    isOrbital: true // Default to orbital motion for new planets
  },
  render: (item: BaseItem) => {
    const planetItem = item as PlanetItem;
    return (
      <div style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative'
      }}>
        <div style={{
          width: planetItem.data.radius * 2,
          height: planetItem.data.radius * 2,
          borderRadius: '50%',
          backgroundColor: planetItem.data.color,
          boxShadow: `0 0 20px ${planetItem.data.color}40`
        }} />
        <div style={{
          marginTop: '10px',
          color: '#fff',
          textAlign: 'center',
          fontSize: '14px',
          fontWeight: 'bold',
          textShadow: '0 0 5px rgba(0,0,0,0.5)'
        }}>
          {planetItem.data.name}
          {planetItem.data.isOrbital && (
            <span style={{ fontSize: '10px', display: 'block', opacity: 0.7 }}>
              ⚫ Orbital
            </span>
          )}
          {!planetItem.data.isOrbital && (
            <span style={{ fontSize: '10px', display: 'block', opacity: 0.7 }}>
              ⚫ Random
            </span>
          )}
        </div>
      </div>
    );
  }
}; 