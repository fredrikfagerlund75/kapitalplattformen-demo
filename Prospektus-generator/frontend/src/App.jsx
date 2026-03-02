import { useState } from 'react'
import Wizard from './components/Wizard'
import LandingPage from './components/LandingPage'

function App() {
  const [started, setStarted] = useState(false)

  return (
    <div className="min-h-screen">
      {!started ? (
        <LandingPage onStart={() => setStarted(true)} />
      ) : (
        <Wizard onBack={() => setStarted(false)} />
      )}
    </div>
  )
}

export default App
