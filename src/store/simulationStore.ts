import { create } from 'zustand';

interface SimulationState {
  isPlaying: boolean;
  showForces: boolean;
  showOrbits: boolean; // Whether to show orbit path predictions
  showTrails: boolean; // Whether to show actual orbit trails
  planetaryForces: boolean; // Controls if planets exert forces on each other
  timeScale: number; // Controls simulation speed (1 = normal, 2 = 2x speed, etc.)
  fps: number;
  G: number; // Gravitational constant
  setIsPlaying: (isPlaying: boolean) => void;
  togglePlaying: () => void;
  setShowForces: (showForces: boolean) => void;
  toggleShowForces: () => void;
  setShowOrbits: (showOrbits: boolean) => void;
  toggleShowOrbits: () => void; // Toggle orbit visualization
  setShowTrails: (showTrails: boolean) => void;
  toggleShowTrails: () => void; // Toggle orbit trails visualization
  setPlanetaryForces: (planetaryForces: boolean) => void;
  togglePlanetaryForces: () => void;
  setTimeScale: (timeScale: number) => void; // Set simulation speed
  setFps: (fps: number) => void;
  setG: (g: number) => void; // Set gravitational constant
}

export const useSimulationStore = create<SimulationState>((set) => ({
  isPlaying: true,
  showForces: true,
  showOrbits: true, // Default to showing orbits
  showTrails: true, // Default to showing orbit trails
  planetaryForces: true, // Default to true for realistic simulation
  timeScale: 1, // Default to normal speed
  fps: 0,
  G: 6.67430, // Gravitational constant (scaled for our simulation)
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  togglePlaying: () => set((state) => ({ isPlaying: !state.isPlaying })),
  setShowForces: (showForces) => set({ showForces }),
  toggleShowForces: () => set((state) => ({ showForces: !state.showForces })),
  setShowOrbits: (showOrbits) => set({ showOrbits }),
  toggleShowOrbits: () => set((state) => ({ showOrbits: !state.showOrbits })),
  setShowTrails: (showTrails) => set({ showTrails }),
  toggleShowTrails: () => set((state) => ({ showTrails: !state.showTrails })),
  setPlanetaryForces: (planetaryForces) => set({ planetaryForces }),
  togglePlanetaryForces: () => set((state) => ({ planetaryForces: !state.planetaryForces })),
  setTimeScale: (timeScale) => set({ timeScale }),
  setFps: (fps) => set({ fps }),
  setG: (g) => set({ G: g }),
})); 