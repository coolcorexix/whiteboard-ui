import { useState, useEffect, useCallback } from "react";
import { Viewport } from "./components/Viewport";
import { CommandPalette } from "./components/CommandPalette";
import { SimulationControls } from "./components/SimulationControls";
import "./App.css";

function App() {
  const [mode, setMode] = useState<"pan" | "add">("pan");
  const [previousMode, setPreviousMode] = useState<"pan" | "add">("pan");

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      switch (e.key) {
        case "1":
          setMode("pan");
          break;
        case "2":
          setMode("add");
          break;
        case " ": // space key
          e.preventDefault();
          if (e.repeat) {
            break;
          }

          setPreviousMode(mode);
          setMode("pan");
          break;
      }
    },
    [mode]
  );
  const handleKeyUp = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === " ") {
        setMode(previousMode);
      }
    },
    [previousMode]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  return (
    <div style={{ position: "relative" }}>
      <Viewport mode={mode} />
      <CommandPalette mode={mode} onModeChange={setMode} />
      <SimulationControls />
    </div>
  );
}

export default App;
