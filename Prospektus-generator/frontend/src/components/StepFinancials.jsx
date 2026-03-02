import { useState } from 'react'
import { generateContent } from '../services/api'

export default function StepFinancials({ 
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
    if (!formData.revenue1 || !formData.revenue2 || !formData.revenue3 || !formData.profitability) {
      setError('Vänligen fyll i all finansiell data först')
      return
    }

    setIsGenerating(true)
    setError(null)

    try {
      // Generate both financial overview and risk factors
      const [financial, risks] = await Promise.all([
        generateContent('financial', {
          companyName: formData.companyName,
          revenue1: formData.revenue1,
          revenue2: formData.revenue2,
          revenue3: formData.revenue3,
          year1: formData.year1,
          year2: formData.year2,
          year3: formData.year3,
          profitability: formData.profitability,
        }),
        generateContent('risks', {
          companyName: formData.companyName,
          industry: formData.industry,
          stage: formData.stage,
          offeringSize: formData.offeringSize,
        })
      ])

      updateGeneratedSection('financial', financial)
      updateGeneratedSection('risks', risks)
    } catch (err) {
      setError('Kunde inte generera innehåll. Försök igen.')
      console.error(err)
    } finally {
      setIsGenerating(false)
    }
  }

  const isValid = formData.revenue1 && formData.revenue2 && formData.revenue3 && 
                  formData.profitability && generatedSections.financial

  return (
    <div className="max-w-5xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="card">
          <h2 className="text-2xl font-bold text-brand-navy mb-2">
            Finansiell Översikt
          </h2>
          <p className="text-gray-600 mb-6">
            Fyll i historisk finansiell data
          </p>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  År
                </label>
                <input
                  type="text"
                  className="input-field bg-gray-50"
                  value={formData.year1}
                  readOnly
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Omsättning (€) *
                </label>
                <input
                  type="number"
                  className="input-field"
                  placeholder="500000"
                  value={formData.revenue1}
                  onChange={(e) => updateFormData({ revenue1: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <input
                  type="text"
                  className="input-field bg-gray-50"
                  value={formData.year2}
                  readOnly
                />
              </div>
              <div>
                <input
                  type="number"
                  className="input-field"
                  placeholder="1200000"
                  value={formData.revenue2}
                  onChange={(e) => updateFormData({ revenue2: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <input
                  type="text"
                  className="input-field bg-gray-50"
                  value={formData.year3}
                  readOnly
                />
              </div>
              <div>
                <input
                  type="number"
                  className="input-field"
                  placeholder="2800000"
                  value={formData.revenue3}
                  onChange={(e) => updateFormData({ revenue3: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Lönsamhetsstatus *
              </label>
              <select
                className="input-field"
                value={formData.profitability}
                onChange={(e) => updateFormData({ profitability: e.target.value })}
                required
              >
                <option value="">Välj status</option>
                <option value="profitable">Lönsam (positiv EBITDA)</option>
                <option value="breakeven">Break-even</option>
                <option value="pre-profit">Ej lönsam än (tillväxtfas)</option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating || !formData.revenue1 || !formData.revenue2 || !formData.revenue3}
              className="btn-primary w-full"
            >
              {isGenerating ? (
                <>
                  <span className="inline-block animate-spin mr-2">⚙️</span>
                  Genererar översikt & riskfaktorer...
                </>
              ) : (
                <>🤖 Generera Finansiell Analys</>
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
        <div className="space-y-4">
          {/* Financial Overview */}
          <div className="card bg-gradient-to-br from-brand-ice to-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-brand-navy">
                Finansiell Översikt
              </h3>
              {generatedSections.financial && (
                <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-semibold">
                  ✓ Klar
                </span>
              )}
            </div>

            {generatedSections.financial ? (
              <div className="p-4 bg-white rounded-lg border border-brand-teal border-opacity-30">
                <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">
                  {generatedSections.financial}
                </p>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400 text-sm">
                <p>Väntar på generering...</p>
              </div>
            )}
          </div>

          {/* Risk Factors */}
          <div className="card bg-gradient-to-br from-brand-ice to-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-brand-navy">
                Riskfaktorer
              </h3>
              {generatedSections.risks && (
                <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-semibold">
                  ✓ Klar
                </span>
              )}
            </div>

            {generatedSections.risks ? (
              <div className="p-4 bg-white rounded-lg border border-brand-teal border-opacity-30">
                <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">
                  {generatedSections.risks}
                </p>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400 text-sm">
                <p>Väntar på generering...</p>
              </div>
            )}
          </div>
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
          Granska & Ladda ner →
        </button>
      </div>
    </div>
  )
}
