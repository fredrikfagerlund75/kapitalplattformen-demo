import axios from 'axios'

const API_BASE_URL = 'http://localhost:3001/api'

export const generateContent = async (section, data) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/generate`, {
      section,
      data
    })
    return response.data.content
  } catch (error) {
    console.error('API Error:', error)
    throw new Error('Failed to generate content')
  }
}

export const generatePDF = async (companyData, sections) => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/generate-pdf`,
      { companyData, sections },
      { responseType: 'blob' }
    )
    
    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `${companyData.companyName}-bolagsbeskrivning.pdf`)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
    
    return true
  } catch (error) {
    console.error('PDF Generation Error:', error)
    throw new Error('Failed to generate PDF')
  }
}
