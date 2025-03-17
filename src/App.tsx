import { useState } from 'react'
import { Viewport } from './components/Viewport'
import { CommandPalette } from './components/CommandPalette'
import './App.css'

function App() {
  const [mode, setMode] = useState<'pan' | 'add'>('pan')

  return (
    <div style={{ position: 'relative' }}>
      <Viewport mode={mode} />
      <CommandPalette mode={mode} onModeChange={setMode} />
    </div>
  )
}

export default App
