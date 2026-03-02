export default function LandingPage({ onStart }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-navy to-brand-teal flex items-center justify-center px-4">
      <div className="max-w-4xl mx-auto text-center text-white">
        <h1 className="text-5xl md:text-6xl font-bold mb-6">
          Prospektus Generator
        </h1>
        
        <p className="text-xl md:text-2xl mb-4 text-brand-ice">
          AI-driven bolagsbeskrivning på minuter
        </p>
        
        <p className="text-lg mb-12 max-w-2xl mx-auto opacity-90">
          Från veckor till minuter. Från €30k till €500. Skapa professionella 
          bolagsbeskrivningar med AI-assistans.
        </p>
        
        <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-2xl p-8 mb-12">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold mb-2">80%</div>
              <div className="text-sm opacity-90">Snabbare</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">€30k</div>
              <div className="text-sm opacity-90">Besparing</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">15 min</div>
              <div className="text-sm opacity-90">Genomsnittlig tid</div>
            </div>
          </div>
        </div>
        
        <button 
          onClick={onStart}
          className="bg-white text-brand-navy px-12 py-4 rounded-full text-xl font-bold hover:bg-brand-ice transition-all transform hover:scale-105 shadow-2xl"
        >
          Skapa Bolagsbeskrivning →
        </button>
        
        <p className="mt-8 text-sm opacity-75">
          Demo version - Ingen registrering krävs
        </p>
      </div>
    </div>
  )
}
