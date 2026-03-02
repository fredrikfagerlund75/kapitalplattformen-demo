import { useState } from 'react'
import StepCompanyInfo from './StepCompanyInfo'
import StepBusinessDescription from './StepBusinessDescription'
import StepFinancials from './StepFinancials'
import StepReview from './StepReview'

const STEPS = [
  { id: 1, name: 'Bolagsinformation', component: StepCompanyInfo },
  { id: 2, name: 'Verksamhetsbeskrivning', component: StepBusinessDescription },
  { id: 3, name: 'Finansiell översikt', component: StepFinancials },
  { id: 4, name: 'Granska & Ladda ner', component: StepReview },
]

export default function Wizard({ onBack }) {
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState({
    companyName: '',
    industry: '',
    stage: '',
    offeringSize: '',
    productDescription: '',
    revenue1: '',
    revenue2: '',
    revenue3: '',
    year1: '2022',
    year2: '2023',
    year3: '2024',
    profitability: '',
  })
  
  const [generatedSections, setGeneratedSections] = useState({
    business: null,
    financial: null,
    risks: null,
  })

  const updateFormData = (updates) => {
    setFormData(prev => ({ ...prev, ...updates }))
  }

  const updateGeneratedSection = (section, content) => {
    setGeneratedSections(prev => ({ ...prev, [section]: content }))
  }

  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const CurrentStepComponent = STEPS[currentStep].component

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-brand-navy">
              Prospektus Generator
            </h1>
            <button
              onClick={onBack}
              className="text-gray-600 hover:text-gray-900"
            >
              ← Tillbaka
            </button>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-2">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex-1">
                <div className="flex items-center">
                  <div className={`
                    flex items-center justify-center w-10 h-10 rounded-full font-bold
                    ${index <= currentStep 
                      ? 'bg-brand-teal text-white' 
                      : 'bg-gray-200 text-gray-500'
                    }
                  `}>
                    {step.id}
                  </div>
                  {index < STEPS.length - 1 && (
                    <div className={`
                      flex-1 h-1 mx-4
                      ${index < currentStep ? 'bg-brand-teal' : 'bg-gray-200'}
                    `} />
                  )}
                </div>
                <div className={`
                  mt-2 text-sm text-center
                  ${index === currentStep ? 'font-bold text-brand-navy' : 'text-gray-500'}
                `}>
                  {step.name}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <CurrentStepComponent
          formData={formData}
          updateFormData={updateFormData}
          generatedSections={generatedSections}
          updateGeneratedSection={updateGeneratedSection}
          onNext={nextStep}
          onPrev={prevStep}
          isFirstStep={currentStep === 0}
          isLastStep={currentStep === STEPS.length - 1}
        />
      </div>
    </div>
  )
}
