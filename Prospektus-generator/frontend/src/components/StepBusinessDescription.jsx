import { useState } from 'react'
import { generateContent } from '../services/api'

export default function StepBusinessDescription({ 
  formData, 
  updateFormData, 
  generatedSections,
  updateGeneratedSection,
  onNext, 
  onPrev 
}) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState(null)

  const handleGenerate = async () => {
    if (!formData.productDescription) {
      setError('Vänligen beskriv er produkt/tjänst först')
      return
    }

    setIsGenerating(true)
    setError(null)

    try {
      const content = await generateContent('business', {
        companyName: formData.companyName,
        industry: formData.industry,
        stage: formData.stage,
        productDescription: formData.productDescription,
      })

      updateGeneratedSection('business', content)
    } catch (err) {
      setError('Kunde inte generera innehåll. Försök igen.')
      console.error(err)
    } finally {
      setIsGenerating(false)
    }
  }

  const isValid = formData.productDescription && generatedSections.business

  return (
    <div className="max-w-5xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="card">
          <h2 className="text-2xl font-bold text-brand-navy mb-2">
            Verksamhetsbeskrivning
          </h2>
          <p className="text-gray-600 mb-6">
            Beskriv er produkt/tjänst så genererar AI:n en professionell beskrivning
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Produkt/Tjänst Beskrivning *
              </label>
              <textarea
                className="input-field"
                rows="6"
                placeholder="t.ex. Vi erbjuder en SaaS-plattform för HR-avdelningar som automatiserar onboarding-processer..."
                value={formData.productDescription}
                onChange={(e) => updateFormData({ productDescription: e.target.value })}
                required
              />
              <p className="text-sm text-gray-500 mt-1">
                Skriv 2-3 meningar om vad ni gör
              </p>
            </div>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating || !formData.productDescription}
              className="btn-primary w-full"
            >
              {isGenerating ? (
                <>
                  <span className="inline-block animate-spin mr-2">⚙️</span>
                  Genererar med AI...
                </>
              ) : (
                <>🤖 Generera Professionell Beskrivning</>
              )}
            </button>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}
          </div>
        </div>

        {/* AI Generated Output */}
        <div className="card bg-gradient-to-br from-brand-ice to-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-brand-navy">
              AI-Genererad Beskrivning
            </h3>
            {generatedSections.business && (
              <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-semibold">
                ✓ Klar
              </span>
            )}
          </div>

          {generatedSections.business ? (
            <div className="space-y-4">
              <div className="p-4 bg-white rounded-lg border border-brand-teal border-opacity-30">
                <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                  {generatedSections.business}
                </p>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="text-sm text-brand-teal hover:text-teal-700 font-semibold"
                >
                  🔄 Generera om
                </button>
                <button
                  onClick={() => updateGeneratedSection('business', null)}
                  className="text-sm text-gray-600 hover:text-gray-800"
                >
                  ✏️ Redigera manuellt
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <div className="text-5xl mb-4">📝</div>
              <p>Klicka på "Generera" för att skapa professionell beskrivning</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="mt-8 flex justify-between">
        <button onClick={onPrev} className="btn-secondary">
          ← Föregående
        </button>
        <button
          onClick={onNext}
          disabled={!isValid}
          className="btn-primary"
        >
          Nästa Steg →
        </button>
      </div>
    </div>
  )
}
