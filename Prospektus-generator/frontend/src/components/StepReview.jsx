import { useState } from 'react'
import { generatePDF } from '../services/api'

export default function StepReview({ 
  formData, 
  generatedSections,
  onPrev 
}) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState(null)

  const handleDownloadPDF = async () => {
    setIsGenerating(true)
    setError(null)

    try {
      await generatePDF(formData, generatedSections)
    } catch (err) {
      setError('Kunde inte generera PDF. Försök igen.')
      console.error(err)
    } finally {
      setIsGenerating(false)
    }
  }

  // Calculate time saved
  const traditionalWeeks = 4
  const actualMinutes = 15

  return (
    <div className="max-w-5xl mx-auto">
      {/* Success Banner */}
      <div className="card bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 mb-6">
        <div className="flex items-start gap-4">
          <div className="text-5xl">✅</div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-green-800 mb-2">
              Dokument klart!
            </h2>
            <p className="text-green-700 mb-4">
              Din bolagsbeskrivning har genererats och är redo att laddas ner.
            </p>
            
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="bg-white bg-opacity-60 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-700">~{actualMinutes} min</div>
                <div className="text-sm text-gray-600">Tid använd</div>
              </div>
              <div className="bg-white bg-opacity-60 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-700">{traditionalWeeks} veckor</div>
                <div className="text-sm text-gray-600">Traditionellt</div>
              </div>
              <div className="bg-white bg-opacity-60 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-700">€30k</div>
                <div className="text-sm text-gray-600">Besparing</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Document Preview */}
        <div className="card">
          <h3 className="text-xl font-bold text-brand-navy mb-4">
            Dokument Innehåll
          </h3>

          <div className="space-y-6">
            {/* Company Info */}
            <div>
              <h4 className="font-semibold text-brand-teal mb-2">
                1. Bolagsinformation
              </h4>
              <div className="text-sm text-gray-700 space-y-1">
                <p><strong>Bolag:</strong> {formData.companyName}</p>
                <p><strong>Bransch:</strong> {formData.industry}</p>
                <p><strong>Stadium:</strong> {formData.stage}</p>
                <p><strong>Emission:</strong> €{parseInt(formData.offeringSize).toLocaleString()}</p>
              </div>
            </div>

            {/* Business Description */}
            <div>
              <h4 className="font-semibold text-brand-teal mb-2">
                2. Verksamhetsbeskrivning
              </h4>
              <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg max-h-32 overflow-y-auto">
                {generatedSections.business?.substring(0, 200)}...
              </div>
            </div>

            {/* Financial Overview */}
            <div>
              <h4 className="font-semibold text-brand-teal mb-2">
                3. Finansiell Översikt
              </h4>
              <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                <p><strong>Omsättning:</strong></p>
                <p>{formData.year1}: €{parseInt(formData.revenue1).toLocaleString()}</p>
                <p>{formData.year2}: €{parseInt(formData.revenue2).toLocaleString()}</p>
                <p>{formData.year3}: €{parseInt(formData.revenue3).toLocaleString()}</p>
              </div>
            </div>

            {/* Risk Factors */}
            <div>
              <h4 className="font-semibold text-brand-teal mb-2">
                4. Riskfaktorer
              </h4>
              <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg max-h-32 overflow-y-auto">
                {generatedSections.risks?.substring(0, 200)}...
              </div>
            </div>
          </div>
        </div>

        {/* Download Actions */}
        <div className="space-y-4">
          <div className="card bg-gradient-to-br from-brand-navy to-brand-teal text-white">
            <h3 className="text-xl font-bold mb-4">
              Ladda ner Dokument
            </h3>
            
            <p className="mb-6 text-brand-ice">
              Dokumentet innehåller alla sektioner formaterade enligt 
              prospekt-standard. Redo för granskning av emissionsinstitut.
            </p>

            <button
              onClick={handleDownloadPDF}
              disabled={isGenerating}
              className="w-full bg-white text-brand-navy px-6 py-4 rounded-lg font-bold hover:bg-brand-ice transition-all disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <span className="inline-block animate-spin mr-2">⚙️</span>
                  Genererar PDF...
                </>
              ) : (
                <>📄 Ladda ner PDF</>
              )}
            </button>

            {error && (
              <div className="mt-4 p-3 bg-red-100 bg-opacity-20 border border-red-300 rounded-lg text-red-100 text-sm">
                {error}
              </div>
            )}
          </div>

          <div className="card">
            <h4 className="font-semibold text-brand-navy mb-3">
              ⚠️ Viktigt att veta
            </h4>
            <ul className="text-sm text-gray-700 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-brand-teal mt-1">•</span>
                <span>Detta är ett <strong>UTKAST</strong> som måste granskas av emissionsinstitut</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-teal mt-1">•</span>
                <span>Juridisk review krävs innan publicering</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-teal mt-1">•</span>
                <span>Dokumentet är genererat med AI och kan innehålla förbättringsområden</span>
              </li>
            </ul>
          </div>

          <div className="card bg-brand-ice bg-opacity-30">
            <h4 className="font-semibold text-brand-navy mb-3">
              🚀 Nästa steg
            </h4>
            <ol className="text-sm text-gray-700 space-y-2">
              <li className="flex items-start gap-2">
                <span className="font-bold text-brand-teal">1.</span>
                <span>Ladda ner PDF och granska innehållet</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-brand-teal">2.</span>
                <span>Skicka till emissionsinstitut för granskning</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-brand-teal">3.</span>
                <span>Genomför emission via vår plattform</span>
              </li>
            </ol>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="mt-8 flex justify-between">
        <button onClick={onPrev} className="btn-secondary">
          ← Föregående
        </button>
        <button
          onClick={handleDownloadPDF}
          disabled={isGenerating}
          className="btn-primary"
        >
          {isGenerating ? 'Genererar PDF...' : '📄 Ladda ner PDF igen'}
        </button>
      </div>
    </div>
  )
}
