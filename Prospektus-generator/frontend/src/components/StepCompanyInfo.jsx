export default function StepCompanyInfo({ formData, updateFormData, onNext, isFirstStep }) {
  const handleSubmit = (e) => {
    e.preventDefault()
    onNext()
  }

  const isValid = formData.companyName && formData.industry && formData.stage && formData.offeringSize

  return (
    <div className="max-w-3xl mx-auto">
      <div className="card">
        <h2 className="text-3xl font-bold text-brand-navy mb-2">
          Bolagsinformation
        </h2>
        <p className="text-gray-600 mb-8">
          Grundläggande information om bolaget och emissionen
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Bolagsnamn *
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="t.ex. TechCo AB"
              value={formData.companyName}
              onChange={(e) => updateFormData({ companyName: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Bransch *
            </label>
            <select
              className="input-field"
              value={formData.industry}
              onChange={(e) => updateFormData({ industry: e.target.value })}
              required
            >
              <option value="">Välj bransch</option>
              <option value="SaaS">SaaS / Mjukvara</option>
              <option value="E-commerce">E-commerce / Retail</option>
              <option value="FinTech">FinTech</option>
              <option value="HealthTech">HealthTech / MedTech</option>
              <option value="CleanTech">CleanTech / Sustainability</option>
              <option value="Consumer">Consumer Products</option>
              <option value="Other">Annan</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Stadium *
            </label>
            <select
              className="input-field"
              value={formData.stage}
              onChange={(e) => updateFormData({ stage: e.target.value })}
              required
            >
              <option value="">Välj stadium</option>
              <option value="Seed">Seed</option>
              <option value="Series A">Series A</option>
              <option value="Series B">Series B</option>
              <option value="Growth">Growth</option>
              <option value="Pre-IPO">Pre-IPO</option>
              <option value="Företrädesemission">Företrädesemission</option>
              <option value="Riktad emission">Riktad emission</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Emissionsstorlek (€) *
            </label>
            <input
              type="number"
              className="input-field"
              placeholder="t.ex. 2000000"
              value={formData.offeringSize}
              onChange={(e) => updateFormData({ offeringSize: e.target.value })}
              required
              min="100000"
              step="100000"
            />
            <p className="text-sm text-gray-500 mt-1">
              Ange belopp i euro
            </p>
          </div>

          <div className="pt-6 flex justify-end">
            <button
              type="submit"
              disabled={!isValid}
              className="btn-primary"
            >
              Nästa Steg →
            </button>
          </div>
        </form>
      </div>

      {/* Quick Demo Hint */}
      <div className="mt-6 p-4 bg-brand-ice bg-opacity-30 rounded-lg text-center">
        <p className="text-sm text-gray-700">
          💡 <strong>Tips:</strong> För en snabb demo, fyll i enkla värden - AI:n kommer generera professionellt innehåll automatiskt
        </p>
      </div>
    </div>
  )
}
