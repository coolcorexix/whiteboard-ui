import { create } from 'zustand';

interface SimulationState {
  isPlaying: boolean;
  showForces: boolean;
  fps: number;
  setIsPlaying: (isPlaying: boolean) => void;
  togglePlaying: () => void;
  setShowForces: (showForces: boolean) => void;
  toggleShowForces: () => void;
  setFps: (fps: number) => void;
}

export const useSimulationStore = create<SimulationState>((set) => ({
  isPlaying: true,
  showForces: true,
  fps: 0,
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  togglePlaying: () => set((state) => ({ isPlaying: !state.isPlaying })),
  setShowForces: (showForces) => set({ showForces }),
  toggleShowForces: () => set((state) => ({ showForces: !state.showForces })),
  setFps: (fps) => set({ fps }),
})); 