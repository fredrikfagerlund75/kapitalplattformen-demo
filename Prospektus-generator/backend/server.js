import express from 'express';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';
import PDFDocument from 'pdfkit';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3001;

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || 'your-api-key-here',
});

app.use(cors());
app.use(express.json());

// AI Content Generation Endpoint
app.post('/api/generate', async (req, res) => {
  try {
    const { section, data } = req.body;
    
    let prompt = '';
    
    switch (section) {
      case 'business':
        prompt = `Du är en professionell finansiell prospektskribent. Generera en verksamhetsbeskrivning för ett investeringsmemorandum.

Bolagsnamn: ${data.companyName}
Bransch: ${data.industry}
Stadium: ${data.stage}
Produkt/Tjänst: ${data.productDescription}

Skriv en professionell verksamhetsbeskrivning (200-250 ord) på svenska i formellt finansiellt språk lämpligt för ett First North-erbjudande. Fokusera på:
- Vad bolaget gör
- Målmarknad
- Värdeerbjudande
- Tillväxtpotential

Inkludera ingen inledning, endast verksamhetsbeskrivningstexten.`;
        break;
        
      case 'risks':
        prompt = `Du är en finansiell riskanalytiker. Generera riskfaktorer för ett investeringsmemorandum.

Bolag: ${data.companyName}
Bransch: ${data.industry}
Stadium: ${data.stage}
Emissionsstorlek: €${data.offeringSize}

Generera 5-6 relevanta riskfaktorer lämpliga för ett ${data.industry}-bolag i ${data.stage}-stadiet på svenska. Varje risk ska vara:
- 2-3 meningar
- Specifik för bolagets profil
- Skriven i formellt prospektspråk

Formatera som en numrerad lista. Inkludera inga rubriker eller inledningar.`;
        break;
        
      case 'financial':
        prompt = `Du är en finansanalytiker. Skriv ett avsnitt om finansiell översikt för ett investeringsmemorandum.

Bolag: ${data.companyName}
Intäktshistorik:
- ${data.year1}: €${data.revenue1}
- ${data.year2}: €${data.revenue2}
- ${data.year3}: €${data.revenue3}

Nuvarande status: ${data.profitability}

Skriv en professionell finansiell översikt (150-200 ord) på svenska som:
- Sammanfattar intäktstillväxten
- Diskuterar nuvarande finansiell ställning
- Nämner användning av emissionslikvid (kapitalet kommer att användas för tillväxtinitiativ)
- Behåller en formell prospektton

Inkludera ingen inledning eller rubriker, endast översiktstexten.`;
        break;
        
      default:
        return res.status(400).json({ error: 'Invalid section type' });
    }
    
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });
    
    const generatedText = message.content[0].text;
    
    res.json({ 
      content: generatedText,
      usage: message.usage 
    });
    
  } catch (error) {
    console.error('AI Generation Error:', error);
    res.status(500).json({ 
      error: 'Failed to generate content',
      details: error.message 
    });
  }
});

// PDF Generation Endpoint
app.post('/api/generate-pdf', async (req, res) => {
  try {
    const { companyData, sections } = req.body;
    
    // Create PDF document
    const doc = new PDFDocument({ 
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 60, right: 60 },
      bufferPages: true
    });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${companyData.companyName}-prospectus.pdf"`);
    
    // Pipe PDF to response
    doc.pipe(res);
    
    // Title Page
    doc.fontSize(28)
       .font('Helvetica-Bold')
       .text('BOLAGSBESKRIVNING', { align: 'center' });
    
    doc.moveDown(1);
    doc.fontSize(20)
       .text(companyData.companyName, { align: 'center' });
    
    doc.moveDown(0.5);
    doc.fontSize(12)
       .font('Helvetica')
       .text(`Emission: €${companyData.offeringSize}`, { align: 'center' });
    
    doc.moveDown(0.5);
    doc.fontSize(10)
       .text(new Date().toLocaleDateString('sv-SE'), { align: 'center' });
    
    doc.addPage();
    
    // Company Information
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .text('1. BOLAGSINFORMATION', { underline: true });
    
    doc.moveDown(0.5);
    doc.fontSize(11)
       .font('Helvetica');
    
    doc.text(`Bolagsnamn: ${companyData.companyName}`);
    doc.text(`Bransch: ${companyData.industry}`);
    doc.text(`Stadium: ${companyData.stage}`);
    doc.text(`Emissionsstorlek: €${companyData.offeringSize}`);
    
    doc.moveDown(1.5);
    
    // Business Description
    if (sections.business) {
      doc.fontSize(16)
         .font('Helvetica-Bold')
         .text('2. VERKSAMHETSBESKRIVNING', { underline: true });
      
      doc.moveDown(0.5);
      doc.fontSize(11)
         .font('Helvetica')
         .text(sections.business, { align: 'justify' });
      
      doc.moveDown(1.5);
    }
    
    // Financial Overview
    if (sections.financial) {
      doc.fontSize(16)
         .font('Helvetica-Bold')
         .text('3. FINANSIELL ÖVERSIKT', { underline: true });
      
      doc.moveDown(0.5);
      doc.fontSize(11)
         .font('Helvetica')
         .text(sections.financial, { align: 'justify' });
      
      doc.moveDown(1.5);
    }
    
    // Risk Factors
    if (sections.risks) {
      doc.fontSize(16)
         .font('Helvetica-Bold')
         .text('4. RISKFAKTORER', { underline: true });
      
      doc.moveDown(0.5);
      doc.fontSize(11)
         .font('Helvetica')
         .text(sections.risks, { align: 'justify' });
    }
    
    // Add footer
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      
      doc.fontSize(8)
         .font('Helvetica')
         .text(
           `${companyData.companyName} - Bolagsbeskrivning | Sida ${i + 1} av ${pages.count}`,
           50,
           doc.page.height - 30,
           { align: 'center' }
         );
    }
    
    // Finalize PDF
    doc.end();
    
  } catch (error) {
    console.error('PDF Generation Error:', error);
    res.status(500).json({ 
      error: 'Failed to generate PDF',
      details: error.message 
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Prospektus Generator API is running' });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
  console.log(`📝 API endpoints available at http://localhost:${PORT}/api`);
});
