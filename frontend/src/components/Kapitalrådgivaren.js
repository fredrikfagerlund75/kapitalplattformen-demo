import React, { useState } from 'react';
import './Kapitalrådgivaren.css';
import { apiPost, apiGet } from '../utils/api';
import { ChevronLeft, ChevronRight, Target, CheckCircle2, FileText, Trash2, Loader, AlertTriangle, Lightbulb, BarChart2, TrendingUp, TrendingDown, ArrowRight, ClipboardList, Zap, Building2, SlidersHorizontal, Sparkles, Search, RefreshCw, Save } from 'lucide-react';

function Kapitalrådgivaren({ user, projekt, companySettings, onBack, onCreateProject, onUpdateProject, onNavigate }) {
  const [step, setStep] = useState(projekt ? 'overview' : 'upload');
  const [loading, setLoading] = useState(false);
  
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState([]);
  const [stockData, setStockData] = useState(null);
  const [fetchingStock, setFetchingStock] = useState(false);
  const [ticker, setTicker] = useState('');

  // Helper: compute 4 quarter slots going backward from latest quarter
  const computeQuarterSlots = (latestQ, latestYear) => {
    const slots = [];
    let q = latestQ;
    let y = latestYear;
    for (let i = 0; i < 4; i++) {
      slots.unshift({ q, year: y });
      q--;
      if (q === 0) { q = 4; y--; }
    }
    return slots;
  };

  const formatQL = (q, year) => year ? `Q${q}-${String(year).slice(-2)}` : `Q${q}`;
  const emptyQuarters = () => [1,2,3,4].map(q => ({ q, year: null, omsättning: null, resultat: null, kassaflöde: null }));

  const [finansiellData, setFinansiellData] = useState({
    quarters: emptyQuarters(),
    egetKapital: '',
    kassa: '',
    skulder: '',
    period: ''
  });

  const [emissionsParametrar, setEmissionsParametrar] = useState({
    rabatt: 20,
    maxSpädning: 38,
    teckningsrätter: '1:2'
  });
  const [bemyndigande, setBemyndigande] = useState('');

  const [analysData, setAnalysData] = useState({
    companyData: {
      name: companySettings?.companyName || user.company,
      industry: companySettings?.industry || '',
      currentCapital: '',
      burnRate: '',
      runway: '',
      purpose: ''
    },
    kapitalbehov: '',
    tidhorisont: '',
    aktivaSektioner: {
      prognoser: false,
      initiativ: false,
      åtaganden: false,
      milestones: false,
      risk: false,
      generellPrognos: false
    },
    prognoser: {
      omsättningstillväxt: '',
      nyaAnställningar: '',
      genomsnittslön: '',
      marknadsföring: '',
      rndInvesteringar: ''
    },
    initiativ: {
      internationalisering: '',
      förvärv: '',
      produktlansering: ''
    },
    åtaganden: {
      lånFörfaller: '',
      lånBelopp: '',
      konvertibler: ''
    },
    milestones: {
      breakEven: '',
      önskadRunway: '18'
    },
    risk: {
      kundkoncentration: '',
      säkerhetsbuffert: '20'
    },
    generellPrognos: {
      intäktsförändring: '',
      kostnadsförändring: ''
    }
  });
  
  const [generatedAnalys, setGeneratedAnalys] = useState('');
  const [emissionsvillkor, setEmissionsvillkor] = useState({
    typ: 'Företrädesemission',
    teckningskurs: '',
    antalNyaAktier: '',
    emissionsvolym: '',
    teckningsrätter: '1:5'
  });

  const [marPmResult, setMarPmResult] = useState('');
  const [protokollResult, setProtokollResult] = useState('');

  const handleGenerateAnalys = async () => {
    setLoading(true);
    setGeneratedAnalys('');
    try {
      const burnRateTSEK = parseFloat(analysData.companyData.burnRate) || 0;
      const kassaTSEK = parseFloat(finansiellData.kassa) || 0;
      const önskadRunway = parseFloat(analysData.milestones?.önskadRunway) || 18;
      const beräknatKapitalbehov = Math.max(0, (burnRateTSEK * önskadRunway) - kassaTSEK);

      const payload = {
        ...analysData,
        finansiellData,
        beräknatKapitalbehov,
        börsdataInfo: stockData ? {
          price: stockData.price,
          currency: stockData.currency || 'SEK',
          sharesOutstanding: stockData.sharesOutstanding,
          marketCap: stockData.marketCap,
          bemyndigande: parseInt(bemyndigande) || null
        } : null
      };

      const response = await apiPost('/api/kapitalradgivaren/emissionsanalys', payload);
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Server svarade ${response.status}: ${errText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6);
          if (payload === '[DONE]') break;
          try {
            const parsed = JSON.parse(payload);
            if (parsed.text) setGeneratedAnalys(prev => prev + parsed.text);
            if (parsed.error) throw new Error(parsed.error);
          } catch (_) {}
        }
      }
    } catch (error) {
      console.error('Failed to generate analys:', error);
      alert('Fel: ' + (error.message || 'Kunde inte ansluta till servern'));
    }
    setLoading(false);
  };

  const handleGenerateMarPM = async (type) => {
    setLoading(true);
    try {
      const response = await apiPost('/api/kapitalradgivaren/mar-pm', {
        type,
        projektData: {
          companyName: projekt.companyName || projekt.name,
          emissionsvillkor: projekt.emissionsvillkor
        }
      });
      const data = await response.json();
      setMarPmResult(data.pressmeddelande);
    } catch (error) {
      console.error('Failed to generate MAR-PM:', error);
    }
    setLoading(false);
  };

  const handleGenerateProtokoll = async () => {
    setLoading(true);
    try {
      const response = await apiPost('/api/kapitalradgivaren/styrelseprotokoll', {
        projektId: projekt.id,
        company: projekt.name,
        emissionsvillkor: projekt.emissionsvillkor
      });
      const data = await response.json();
      setProtokollResult(data.content);
    } catch (error) {
      console.error('Failed to generate protokoll:', error);
    }
    setLoading(false);
  };

  const recalcBurnRate = (quarters, kassa) => {
    const kfValues = (quarters || []).map(s => s?.kassaflöde);
    const validQuarters = kfValues.filter(v => v !== null && v !== undefined);
    if (validQuarters.length === 0 || !kassa) return;

    let weightedSum = 0;
    let totalWeight = 0;
    kfValues.forEach((v, i) => {
      if (v !== null && v !== undefined) {
        const weight = i + 1;
        weightedSum += Math.abs(parseInt(v)) * weight;
        totalWeight += weight;
      }
    });

    const avgQuarterlyBurn = totalWeight > 0 ? weightedSum / totalWeight : 0;
    const burnRatePerMonth = avgQuarterlyBurn / 3;
    const runway = burnRatePerMonth > 0 ? parseFloat(kassa) / burnRatePerMonth : 0;

    const indexed = kfValues.map((v, i) => ({ v, i })).filter(x => x.v !== null && x.v !== undefined);
    let trend = 'stable';
    if (indexed.length >= 2) {
      const latest = Math.abs(parseInt(indexed[indexed.length - 1].v));
      const previous = Math.abs(parseInt(indexed[indexed.length - 2].v));
      if (latest > previous * 1.1) trend = 'increasing';
      else if (latest < previous * 0.9) trend = 'decreasing';
    }

    setAnalysData(prev => ({
      ...prev,
      companyData: {
        ...prev.companyData,
        currentCapital: kassa,
        burnRate: burnRatePerMonth.toFixed(0),
        runway: runway.toFixed(1),
        burnRateTrend: trend,
        quartersUsed: validQuarters.length
      }
    }));
  };

  // ROLLBACK: Ändra till false för att använda billig text-extraction (pdf-parse)
  const USE_DOCUMENT_API = true;

  const processOneFile = async (file) => {
    try {
      const base64Data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = () => reject(new Error('Kunde inte läsa filen'));
        reader.readAsDataURL(file);
      });

      const endpoint = USE_DOCUMENT_API
        ? '/api/kapitalradgivaren/extract-financial-data'
        : '/api/kapitalradgivaren/extract-financial-data-text';

      const response = await apiPost(endpoint, {
        fileName: file.name,
        fileData: base64Data
      });

      if (!response.ok) {
        if (response.status === 429) {
          const errData = await response.json().catch(() => ({}));
          return { success: false, error: 'Rate limit', retryAfter: errData.retryAfter || 60 };
        }
        // If text endpoint returned 422 (bad text), try document API as fallback
        if (!USE_DOCUMENT_API && response.status === 422) {
          console.log(`Text extraction failed for ${file.name}, trying document API fallback...`);
          const fallbackResponse = await apiPost('/api/kapitalradgivaren/extract-financial-data', {
            fileName: file.name,
            fileData: base64Data
          });
          if (fallbackResponse.ok) {
            const fallbackData = await fallbackResponse.json();
            if (!fallbackData.parseError && !(fallbackData.error && fallbackData.fallback)) {
              return { success: true, data: fallbackData };
            }
          }
          // If document API fallback hit rate limit, propagate it for auto-retry
          if (fallbackResponse.status === 429) {
            const errData = await fallbackResponse.json().catch(() => ({}));
            return { success: false, error: 'Rate limit', retryAfter: errData.retryAfter || 60 };
          }
          return { success: false, error: `Fallback misslyckades (${fallbackResponse.status})` };
        }
        return { success: false, error: `API-fel: ${response.status}` };
      }

      const extractedData = await response.json();

      if (extractedData.error && extractedData.fallback) {
        return { success: false, error: 'Kunde inte tolka PDF' };
      }
      if (extractedData.parseError) {
        return { success: false, error: 'Kunde inte tolka PDF-innehåll' };
      }

      return { success: true, data: extractedData };
    } catch (error) {
      console.error(`processOneFile failed for ${file.name}:`, error);
      return { success: false, error: error.message || 'Okänt fel' };
    }
  };

  const handleFileUpload = async (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const pdfFiles = Array.from(files).filter(f => f.type === 'application/pdf');
    if (pdfFiles.length === 0) {
      alert('Vänligen välj PDF-filer');
      return;
    }

    setLoading(true);
    setUploadProgress(pdfFiles.map(f => ({ name: f.name, status: 'waiting', quarter: null, message: '' })));

    // Build raw data map from existing uploaded quarters
    const rawDataMap = {};
    const balanceMap = {};
    finansiellData.quarters.forEach(slot => {
      if (slot && slot.year && (slot.omsättning != null || slot.resultat != null || slot.kassaflöde != null)) {
        rawDataMap[`${slot.year}-${slot.q}`] = {
          omsättning: slot.omsättning,
          resultat: slot.resultat,
          kassaflöde: slot.kassaflöde
        };
      }
    });
    let accEgetKapital = finansiellData.egetKapital;
    let accKassa = finansiellData.kassa;
    let accSkulder = finansiellData.skulder;
    const newFileNames = [];

    // Process files 2 at a time to stay within rate limits (50k tokens/min)
    const processWithRetry = async (file, idx) => {
      setUploadProgress(prev => prev.map((p, i) => i === idx ? { ...p, status: 'processing' } : p));

      let result = await processOneFile(file);

      // Auto-retry on rate limit (max 3 attempts)
      for (let attempt = 1; attempt <= 3 && !result.success && result.retryAfter; attempt++) {
        const waitSec = result.retryAfter;
        setUploadProgress(prev => prev.map((p, i) => i === idx ? { ...p, status: 'processing', message: `Väntar ${waitSec}s (rate limit, försök ${attempt}/3)...` } : p));
        await new Promise(r => setTimeout(r, waitSec * 1000));
        result = await processOneFile(file);
      }

      if (result.success) {
        const d = result.data;
        newFileNames.push(file.name);
        const fileQ = parseInt(d.quarter);
        const fileYear = parseInt(d.year);
        if (fileQ && fileYear) {
          const key = `${fileYear}-${fileQ}`;
          const omsVal = Array.isArray(d.omsättning) ? d.omsättning[fileQ - 1] : null;
          const resVal = Array.isArray(d.resultat) ? d.resultat[fileQ - 1] : null;
          let kfVal = null;
          if (Array.isArray(d.kassaflödeRörelse)) {
            kfVal = d.kassaflödeRörelse[fileQ - 1];
          } else if (d.kassaflödeRörelse) {
            kfVal = parseInt(d.kassaflödeRörelse);
          }
          rawDataMap[key] = {
            omsättning: omsVal ?? rawDataMap[key]?.omsättning ?? null,
            resultat: resVal ?? rawDataMap[key]?.resultat ?? null,
            kassaflöde: kfVal ?? rawDataMap[key]?.kassaflöde ?? null
          };
          balanceMap[key] = {
            kassa: d.kassa || balanceMap[key]?.kassa,
            egetKapital: d.egetKapital || balanceMap[key]?.egetKapital,
            skulder: d.skulder || balanceMap[key]?.skulder
          };
          const qLabel = formatQL(fileQ, fileYear);
          setUploadProgress(prev => prev.map((p, i) => i === idx ? { ...p, status: 'done', quarter: fileQ, message: `Klar (${qLabel})` } : p));
        } else {
          setUploadProgress(prev => prev.map((p, i) => i === idx ? { ...p, status: 'done', message: 'Klar' } : p));
        }
      } else {
        setUploadProgress(prev => prev.map((p, i) => i === idx ? { ...p, status: 'error', message: result.error } : p));
      }
    };

    // Run in batches of 2 (avoids exceeding 50k tokens/min rate limit)
    for (let i = 0; i < pdfFiles.length; i += 2) {
      await Promise.all(pdfFiles.slice(i, i + 2).map((file, j) => processWithRetry(file, i + j)));
    }

    // Build final quarter view from merged rawDataMap
    let latestNum = 0, latQ = null, latY = null;
    Object.keys(rawDataMap).forEach(k => {
      const [y, qq] = k.split('-').map(Number);
      const num = y * 4 + qq;
      if (num > latestNum) { latestNum = num; latQ = qq; latY = y; }
    });
    if (latQ && latY) {
      const latBal = balanceMap[`${latY}-${latQ}`];
      if (latBal?.kassa) accKassa = latBal.kassa;
      if (latBal?.egetKapital) accEgetKapital = latBal.egetKapital;
      if (latBal?.skulder) accSkulder = latBal.skulder;

      const slots = computeQuarterSlots(latQ, latY);
      const quarters = slots.map(s => {
        const data = rawDataMap[`${s.year}-${s.q}`];
        return { q: s.q, year: s.year, omsättning: data?.omsättning ?? null, resultat: data?.resultat ?? null, kassaflöde: data?.kassaflöde ?? null };
      });
      setFinansiellData({
        quarters,
        egetKapital: accEgetKapital,
        kassa: accKassa,
        skulder: accSkulder,
        period: `Q${latQ} ${latY}`
      });
    }

    // Final updates
    if (newFileNames.length > 0) {
      setUploadedFiles(prev => [...prev, ...newFileNames]);
    }
    // Recalc burn rate using the merged quarter data
    if (latQ && latY && accKassa) {
      const finalSlots = computeQuarterSlots(latQ, latY);
      const finalQuarters = finalSlots.map(s => {
        const data = rawDataMap[`${s.year}-${s.q}`];
        return { q: s.q, year: s.year, omsättning: data?.omsättning ?? null, resultat: data?.resultat ?? null, kassaflöde: data?.kassaflöde ?? null };
      });
      recalcBurnRate(finalQuarters, accKassa);
    }

    setStep('granska-data');
    setLoading(false);
  };

  const handleFetchStockData = async () => {
    if (!ticker) {
      alert('Ange ticker-symbol först');
      return;
    }

    setFetchingStock(true);
    try {
      const response = await apiGet(`/api/stock-data/${ticker}`);
      const data = await response.json();

      if (data.notFound) {
        alert(`Kunde inte hitta ticker "${ticker}" på First North (.ST) eller Nordic SME (.NGM).\n\nKontrollera att du angett rätt ticker-symbol och försök igen, eller fortsätt utan börsdata.`);
        setFetchingStock(false);
        return;
      }

      setStockData(data);

      const kassaTSEK = parseInt(analysData.companyData.currentCapital) || 20000;
      const kapitalbehovSEK = kassaTSEK * 1000;

      let rekommenderadRabatt = 20;
      let rekommenderadSpädning = 38;
      let rekommenderadeTeckningsrätter = '1:2';

      if (data.marketCap) {
        const behovVsBörsvärdeRatio = kapitalbehovSEK / data.marketCap;
        if (behovVsBörsvärdeRatio > 1.5) {
          rekommenderadRabatt = 25;
          rekommenderadSpädning = 45;
          rekommenderadeTeckningsrätter = '1:1';
        } else if (behovVsBörsvärdeRatio < 0.5) {
          rekommenderadRabatt = 15;
          rekommenderadSpädning = 30;
          rekommenderadeTeckningsrätter = '1:4';
        }
      }

      setEmissionsParametrar({
        rabatt: rekommenderadRabatt,
        maxSpädning: rekommenderadSpädning,
        teckningsrätter: rekommenderadeTeckningsrätter
      });

      alert(`Börsdata hämtad för ${data.ticker}!`);
    } catch (error) {
      console.error('Stock fetch failed:', error);
      alert('Kunde inte hämta börsdata. Kontrollera ticker-symbol eller fortsätt manuellt.');
    }
    setFetchingStock(false);
  };

  const generateAutoEmissionTerms = () => {
    if (!stockData) return;
    
    const teckningskurs = stockData.price * (1 - emissionsParametrar.rabatt / 100);
    
    const kassaTSEK = parseInt(analysData.companyData.currentCapital) || 20000;
    const burnRateTSEK = parseInt(analysData.companyData.burnRate) || 2500;
    const önskadRunway = parseInt(analysData.milestones?.önskadRunway) || 18;
    
    const kapitalbehovTSEK = (burnRateTSEK * önskadRunway) - kassaTSEK;
    const kapitalbehovSEK = kapitalbehovTSEK * 1000;
    
    const antalNyaAktier = Math.round(kapitalbehovSEK / teckningskurs);

    setEmissionsvillkor({
      typ: 'Företrädesemission',
      teckningskurs: teckningskurs.toFixed(2),
      antalNyaAktier: antalNyaAktier.toString(),
      emissionsvolym: kapitalbehovSEK,
      teckningsrätter: emissionsParametrar.teckningsrätter
    });

    if (stockData.sharesOutstanding) {
      const spädning = (antalNyaAktier / (stockData.sharesOutstanding + antalNyaAktier)) * 100;
      if (spädning > emissionsParametrar.maxSpädning) {
        alert(`Varning: Beräknad spädning (${spädning.toFixed(1)}%) överstiger ert mål (${emissionsParametrar.maxSpädning}%)`);
      }
    }
  };

  const handleCreateProject = async () => {
    setLoading(true);
    try {
      const projektData = {
        name: `${emissionsvillkor.typ} ${new Date().getFullYear()}`,
        emissionsvillkor,
        finansiellData,
        tidsplan: [
          { datum: new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0], milestone: 'Styrelsebeslut', completed: false },
          { datum: new Date(Date.now() + 21*24*60*60*1000).toISOString().split('T')[0], milestone: 'Prospekt klart', completed: false },
          { datum: new Date(Date.now() + 35*24*60*60*1000).toISOString().split('T')[0], milestone: 'Emission öppnar', completed: false },
          { datum: new Date(Date.now() + 49*24*60*60*1000).toISOString().split('T')[0], milestone: 'Emission stänger', completed: false },
          { datum: new Date(Date.now() + 56*24*60*60*1000).toISOString().split('T')[0], milestone: 'Tilldelning', completed: false }
        ]
      };
      
      const newProjekt = await onCreateProject(projektData);
      alert('Emissionsprojekt skapat! Går vidare till Projektvyn...');
      onNavigate('projektvy', newProjekt);
    } catch (error) {
      console.error('Failed to create project:', error);
      alert('Demo: Projekt skapat (backend offline)');
    }
    setLoading(false);
  };

  if (projekt && step === 'overview') {
    return (
      <div className="module-container">
        <div className="module-header">
          <button className="back-button" onClick={onBack}><ChevronLeft size={16} strokeWidth={1.5} /> Tillbaka</button>
          <h1><Target size={20} strokeWidth={1.5} /> Kapitalrådgivaren</h1>
        </div>
        <div className="module-content">
          <div className="project-overview">
            <h2>{projekt.name}</h2>
            <div className="info-grid">
              <div className="info-item">
                <strong>Emissionstyp:</strong> {projekt.emissionsvillkor.typ}
              </div>
              <div className="info-item">
                <strong>Volym:</strong> {projekt.emissionsvillkor.emissionsvolym.toLocaleString('sv-SE')} SEK
              </div>
              <div className="info-item">
                <strong>Teckningskurs:</strong> {projekt.emissionsvillkor.teckningskurs} SEK
              </div>
            </div>
            
            <div className="actions-section">
              <button className="btn-secondary" onClick={() => setStep('upload')} style={{marginBottom: '1.5rem'}}>
                <Target size={14} strokeWidth={1.5} /> Starta ny analys (nytt emissionsprojekt)
              </button>
              <h3>Tillgängliga åtgärder</h3>
              <div style={{display:'flex', gap:'8px', flexWrap:'wrap', marginBottom:'12px'}}>
                <button className="btn-primary" onClick={() => handleGenerateMarPM('beslut')} disabled={loading}>
                  <ClipboardList size={14} strokeWidth={1.5} /> MAR-PM: Styrelsebeslut
                </button>
                <button className="btn-primary" onClick={() => handleGenerateMarPM('prospekt')} disabled={loading}>
                  <ClipboardList size={14} strokeWidth={1.5} /> MAR-PM: Prospekt godkänt
                </button>
                <button className="btn-primary" onClick={() => handleGenerateMarPM('utfall')} disabled={loading}>
                  <ClipboardList size={14} strokeWidth={1.5} /> MAR-PM: Utfall emission
                </button>
              </div>
              <button className="btn-secondary" onClick={handleGenerateProtokoll} disabled={loading}>
                <ClipboardList size={14} strokeWidth={1.5} /> Generera styrelseprotokoll
              </button>
              <button className="btn-secondary" onClick={() => alert('Påminnelse: Kom ihåg att föra insynslogg!')} style={{marginLeft:'8px'}}>
                <AlertTriangle size={14} strokeWidth={1.5} /> Påminn om insynslogg
              </button>

              {marPmResult && (
                <div className="generated-content" style={{marginTop:'16px'}}>
                  <h3><ClipboardList size={16} strokeWidth={1.5} /> Genererat MAR-PM</h3>
                  <pre style={{whiteSpace:'pre-wrap',background:'#f8f9fa',padding:'16px',borderRadius:'8px',fontSize:'14px'}}>{marPmResult}</pre>
                </div>
              )}

              {protokollResult && (
                <div className="generated-content" style={{marginTop:'16px'}}>
                  <h3><ClipboardList size={16} strokeWidth={1.5} /> Genererat Styrelseprotokoll</h3>
                  <pre style={{whiteSpace:'pre-wrap',background:'#f8f9fa',padding:'16px',borderRadius:'8px',fontSize:'14px'}}>{protokollResult}</pre>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="module-container">
      <div className="module-header">
        <button className="back-button" onClick={onBack}><ChevronLeft size={16} strokeWidth={1.5} /> Tillbaka</button>
        <h1><Target size={20} strokeWidth={1.5} /> Kapitalrådgivaren</h1>
      </div>

      <div className="wizard-steps">
        <div className={`step clickable ${step === 'upload' ? 'active' : ['granska-data','prognoser','analys','börsdata','villkor','skapa'].includes(step) ? 'completed' : ''}`} onClick={() => setStep('upload')}>1. Ladda upp</div>
        <div className={`step clickable ${step === 'granska-data' ? 'active' : ['prognoser','analys','börsdata','villkor','skapa'].includes(step) ? 'completed' : ''}`} onClick={() => setStep('granska-data')}>2. Granska</div>
        <div className={`step clickable ${step === 'prognoser' ? 'active' : ['analys','börsdata','villkor','skapa'].includes(step) ? 'completed' : ''}`} onClick={() => setStep('prognoser')}>3. Prognoser</div>
        <div className={`step clickable ${step === 'börsdata' ? 'active' : ['analys','villkor','skapa'].includes(step) ? 'completed' : ''}`} onClick={() => setStep('börsdata')}>4. Börsdata</div>
        <div className={`step clickable ${step === 'analys' ? 'active' : ['villkor','skapa'].includes(step) ? 'completed' : ''}`} onClick={() => setStep('analys')}>5. AI Kapitalbehovsanalys</div>
        <div className={`step clickable ${step === 'villkor' ? 'active' : step === 'skapa' ? 'completed' : ''}`} onClick={() => setStep('villkor')}>6. Villkor</div>
        <div className={`step clickable ${step === 'skapa' ? 'active' : ''}`} onClick={() => setStep('skapa')}>7. Skapa</div>
      </div>

      <div className="module-content">
        {step === 'upload' && (
          <div className="upload-step">
            <h2>Ladda upp kvartalsrapporter</h2>
            <p>Ladda upp en kvartalsrapport i taget. AI extraherar automatiskt finansiell data.</p>

            {/* Quarter status indicators */}
            <div className="quarter-status" style={{display: 'flex', gap: '1rem', justifyContent: 'center', margin: '1.5rem 0'}}>
              {finansiellData.quarters.map((slot, i) => {
                const hasData = slot.omsättning != null;
                const label = formatQL(slot.q, slot.year);
                return (
                  <div key={i} style={{
                    padding: '0.5rem 1rem', borderRadius: '8px', fontWeight: 600, fontSize: '0.9rem',
                    background: hasData ? '#f0fff4' : '#f7fafc',
                    border: `2px solid ${hasData ? '#48bb78' : '#e2e8f0'}`,
                    color: hasData ? '#276749' : '#a0aec0'
                  }}>
                    {label} {hasData ? <CheckCircle2 size={14} strokeWidth={1.5} /> : '—'}
                  </div>
                );
              })}
            </div>

            <div className="upload-zone">
              <input 
                type="file" 
                id="report-upload" 
                accept=".pdf"
                multiple
                onChange={handleFileUpload}
                style={{display: 'none'}}
              />
              <label 
                htmlFor="report-upload" 
                className={`upload-label ${uploadedFiles.length > 0 ? '' : ''}`}
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('drag-over'); }}
                onDragLeave={(e) => { e.currentTarget.classList.remove('drag-over'); }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove('drag-over');
                  const files = e.dataTransfer.files;
                  const pdfFiles = Array.from(files).filter(f => f.type === 'application/pdf');
                  if (pdfFiles.length > 0) {
                    const input = document.getElementById('report-upload');
                    const dt = new DataTransfer();
                    pdfFiles.forEach(f => dt.items.add(f));
                    input.files = dt.files;
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                  } else {
                    alert('Vänligen välj PDF-filer');
                  }
                }}
              >
                {uploadedFiles.length > 0 ? (
                  <>
                    <div className="upload-icon"><CheckCircle2 size={24} strokeWidth={1.5} /></div>
                    <div className="upload-text">
                      <strong>{uploadedFiles.length} fil{uploadedFiles.length > 1 ? 'er' : ''} uppladdade</strong>
                      <p style={{fontSize: '0.85rem', opacity: 0.8}}>{uploadedFiles.join(', ')}</p>
                      <p>Klicka för att ladda upp fler</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="upload-icon"><FileText size={24} strokeWidth={1.5} /></div>
                    <div className="upload-text">
                      <strong>Dra och släpp PDF här</strong>
                      <p>eller klicka för att välja fil</p>
                    </div>
                  </>
                )}
              </label>

              {uploadedFiles.length > 0 && (
                <button 
                  className="btn-delete-file"
                  onClick={() => {
                    setUploadedFiles([]);
                    setUploadProgress([]);
                    setFinansiellData({
                      quarters: emptyQuarters(), egetKapital: '', kassa: '',
                      skulder: '', period: ''
                    });
                    setAnalysData(prev => ({
                      ...prev,
                      companyData: { ...prev.companyData, burnRate: '', runway: '', burnRateTrend: '', quartersUsed: 0 }
                    }));
                    const input = document.getElementById('report-upload');
                    if (input) input.value = '';
                  }}
                >
                  <Trash2 size={14} strokeWidth={1.5} /> Ta bort alla uppladdade filer
                </button>
              )}
              
              {uploadProgress.length > 0 && (
                <div className="upload-progress-list">
                  <p className="progress-header">
                    Fil {uploadProgress.filter(p => p.status === 'done' || p.status === 'error').length} av {uploadProgress.length}
                  </p>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{width: `${(uploadProgress.filter(p => p.status === 'done' || p.status === 'error').length / uploadProgress.length) * 100}%`}} />
                  </div>
                  {uploadProgress.map((item, i) => (
                    <div key={i} className={`progress-item progress-${item.status}`}>
                      <span className="progress-icon">
                        {item.status === 'waiting' && <Loader size={14} strokeWidth={1.5} />}
                        {item.status === 'processing' && '⚙️'}
                        {item.status === 'done' && <CheckCircle2 size={14} strokeWidth={1.5} />}
                        {item.status === 'error' && <AlertTriangle size={14} strokeWidth={1.5} />}
                      </span>
                      <span className="progress-name">{item.name}</span>
                      <span className="progress-status">
                        {item.status === 'waiting' && 'Väntar...'}
                        {item.status === 'processing' && 'Bearbetar...'}
                        {item.status === 'done' && item.message}
                        {item.status === 'error' && `Fel: ${item.message}`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {loading && uploadProgress.length === 0 && (
                <div className="loading-indicator">
                  <div className="spinner"></div>
                  <p>Extraherar finansiell data med AI...</p>
                </div>
              )}
            </div>

            <div className="info-box" style={{background: '#f0f7ff', border: '1px solid #c8ddf5', borderRadius: '8px', padding: '24px', marginBottom: '24px'}}>
              <p><strong><Lightbulb size={14} strokeWidth={1.5} /> Tips:</strong> Ladda upp en rapport i taget. Systemet behåller data från tidigare uppladdade kvartal.</p>
              <p>AI extraherar automatiskt:</p>
              <ul style={{marginLeft: '1.5rem', marginTop: '0.5rem'}}>
                <li>Omsättning (senaste 4 kvartalen)</li>
                <li>Resultat och kassaflöde</li>
                <li>Kassa och eget kapital</li>
              </ul>
            </div>

            <div className="alternative-option">
              <p>Har du inte en rapport tillgänglig?</p>
              <button 
                className="btn-secondary"
                onClick={() => setStep('granska-data')}
              >
                Ange data manuellt <ChevronRight size={14} strokeWidth={1.5} />
              </button>
            </div>
          </div>
        )}

        {step === 'granska-data' && (
          <div className="data-review-step">
            <h2>Granska och justera finansiell data</h2>
            <p>AI har extraherat data. Granska och justera vid behov.</p>

            <div className="data-section">
              <h3><BarChart2 size={16} strokeWidth={1.5} /> Resultaträkning (senaste 4 kvartalen)</h3>
              <div className="quarterly-data">
                {finansiellData.quarters.map((slot, index) => {
                  const label = formatQL(slot.q, slot.year);
                  return (
                    <div key={index} className="quarter-input">
                      <label>{label} Omsättning (TSEK)</label>
                      <input 
                        type="number"
                        value={slot.omsättning != null ? slot.omsättning : ''}
                        onChange={(e) => {
                          const newQ = [...finansiellData.quarters];
                          newQ[index] = { ...newQ[index], omsättning: parseInt(e.target.value) || 0 };
                          setFinansiellData({...finansiellData, quarters: newQ});
                        }}
                      />
                      <label>{label} Resultat (TSEK)</label>
                      <input 
                        type="number"
                        value={slot.resultat != null ? slot.resultat : ''}
                        onChange={(e) => {
                          const newQ = [...finansiellData.quarters];
                          newQ[index] = { ...newQ[index], resultat: parseInt(e.target.value) || 0 };
                          setFinansiellData({...finansiellData, quarters: newQ});
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="data-section">
              <h3>💰 Balansräkning</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>Kassa och bank (TSEK)</label>
                  <input 
                    type="number"
                    value={finansiellData.kassa}
                    onChange={(e) => {
                      const newKassa = e.target.value;
                      setFinansiellData({...finansiellData, kassa: newKassa});
                      recalcBurnRate(finansiellData.quarters, newKassa);
                    }}
                  />
                </div>
                <div className="form-group">
                  <label>Eget kapital (TSEK)</label>
                  <input 
                    type="number"
                    value={finansiellData.egetKapital}
                    onChange={(e) => setFinansiellData({...finansiellData, egetKapital: e.target.value})}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Totala skulder (TSEK)</label>
                <input 
                  type="number"
                  value={finansiellData.skulder}
                  onChange={(e) => setFinansiellData({...finansiellData, skulder: e.target.value})}
                />
              </div>
            </div>

            <div className="data-section">
              <h3>💸 Kassaflöde per kvartal (TSEK)</h3>
              <p style={{opacity: 0.85, fontSize: '0.9rem'}}>
                Periodens kassaflöde per kvartal. Negativt tal = kassan minskade.
              </p>
              <div className="quarterly-data">
                {finansiellData.quarters.map((slot, index) => {
                  const label = formatQL(slot.q, slot.year);
                  return (
                    <div key={index} className="quarter-input">
                      <label>{label} Kassaflöde (TSEK)</label>
                      <input 
                        type="number"
                        value={slot.kassaflöde != null ? slot.kassaflöde : ''}
                        onChange={(e) => {
                          const newQ = [...finansiellData.quarters];
                          newQ[index] = { ...newQ[index], kassaflöde: e.target.value ? parseInt(e.target.value) : null };
                          setFinansiellData({...finansiellData, quarters: newQ});
                          recalcBurnRate(newQ, finansiellData.kassa);
                        }}
                        placeholder="Negativt = kassan minskar"
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="calculated-metrics">
              <h3>🧮 Beräknade nyckeltal</h3>
              <p style={{opacity: 0.85, fontSize: '0.9rem', marginBottom: '1rem'}}>
                Beräknade från {analysData.companyData.quartersUsed || 0} kvartal med viktad genomsnittsmetod
                (senaste kvartal väger tyngst).
              </p>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                <div className="metric-card">
                  <div className="metric-label">Burn rate (kassaförbrukning/månad)</div>
                  <div className="metric-value">
                    {analysData.companyData.burnRate ? 
                      `${parseFloat(analysData.companyData.burnRate).toLocaleString('sv-SE')} TSEK` : 
                      '-'}
                  </div>
                  <div style={{fontSize: '0.8rem', opacity: 0.8, marginTop: '0.5rem'}}>
                    Viktad snitt av {analysData.companyData.quartersUsed || '-'} kvartal / 3 mån
                    {analysData.companyData.burnRateTrend === 'increasing' &&
                      <span style={{color: '#ff6b6b', marginLeft: '0.5rem'}}><TrendingUp size={14} strokeWidth={1.5} /> Ökande trend</span>}
                    {analysData.companyData.burnRateTrend === 'decreasing' &&
                      <span style={{color: '#51cf66', marginLeft: '0.5rem'}}><TrendingDown size={14} strokeWidth={1.5} /> Minskande trend</span>}
                    {analysData.companyData.burnRateTrend === 'stable' &&
                      <span style={{color: '#ffd43b', marginLeft: '0.5rem'}}><ArrowRight size={14} strokeWidth={1.5} /> Stabil</span>}
                  </div>
                </div>
                <div className="metric-card">
                  <div className="metric-label">Runway (månader kvar med nuvarande kassa)</div>
                  <div className="metric-value" style={{
                    color: analysData.companyData.runway && parseFloat(analysData.companyData.runway) < 6 
                      ? '#ff6b6b' 
                      : analysData.companyData.runway && parseFloat(analysData.companyData.runway) < 12 
                        ? '#ffd43b' 
                        : '#51cf66'
                  }}>
                    {analysData.companyData.runway ? 
                      `${analysData.companyData.runway} månader` : 
                      '-'}
                  </div>
                  <div style={{fontSize: '0.8rem', opacity: 0.8, marginTop: '0.5rem'}}>
                    Kassa / Viktad burn rate
                    {analysData.companyData.runway && parseFloat(analysData.companyData.runway) < 6 &&
                      <> <AlertTriangle size={14} strokeWidth={1.5} /> Kritiskt låg</>}
                  </div>
                </div>
              </div>
            </div>

            <div className="button-row">
              <button className="btn-secondary" onClick={() => setStep('upload')}>
                <ChevronLeft size={16} strokeWidth={1.5} /> Tillbaka
              </button>
              <button className="btn-primary" onClick={() => setStep('prognoser')}>
                Data ser bra ut, fortsätt <ChevronRight size={14} strokeWidth={1.5} />
              </button>
            </div>
          </div>
        )}

        {step === 'prognoser' && (
          <div className="prognoser-step">
            <h2>Kompletterande information</h2>
            <p>Välj vilka delar du vill komplettera. AI anpassar analysen efter tillgänglig data.</p>

            <div className="section-selector">
              <h3><ClipboardList size={16} strokeWidth={1.5} /> Välj vad du vill komplettera</h3>
              <p className="selector-subtitle">
                Bocka i de sektioner du har information om. Resten kan hoppas över.
              </p>
              
              <div className="checkbox-grid">
                <label className="checkbox-card">
                  <input 
                    type="checkbox"
                    checked={analysData.aktivaSektioner.prognoser}
                    onChange={(e) => setAnalysData({
                      ...analysData, 
                      aktivaSektioner: {...analysData.aktivaSektioner, prognoser: e.target.checked}
                    })}
                  />
                  <div className="checkbox-content">
                    <div className="checkbox-icon"><TrendingUp size={20} strokeWidth={1.5} /></div>
                    <div className="checkbox-label">
                      <strong>Intäkts- och kostnadsprognoser</strong>
                      <span>Förväntad tillväxt, anställningar, investeringar</span>
                    </div>
                  </div>
                </label>

                <label className="checkbox-card">
                  <input 
                    type="checkbox"
                    checked={analysData.aktivaSektioner.initiativ}
                    onChange={(e) => setAnalysData({
                      ...analysData, 
                      aktivaSektioner: {...analysData.aktivaSektioner, initiativ: e.target.checked}
                    })}
                  />
                  <div className="checkbox-content">
                    <div className="checkbox-icon"><Zap size={20} strokeWidth={1.5} /></div>
                    <div className="checkbox-label">
                      <strong>Strategiska initiativ</strong>
                      <span>Expansion, förvärv, produktlansering</span>
                    </div>
                  </div>
                </label>

                <label className="checkbox-card">
                  <input 
                    type="checkbox"
                    checked={analysData.aktivaSektioner.åtaganden}
                    onChange={(e) => setAnalysData({
                      ...analysData, 
                      aktivaSektioner: {...analysData.aktivaSektioner, åtaganden: e.target.checked}
                    })}
                  />
                  <div className="checkbox-content">
                    <div className="checkbox-icon"><Building2 size={20} strokeWidth={1.5} /></div>
                    <div className="checkbox-label">
                      <strong>Finansiella åtaganden</strong>
                      <span>Lån, konvertibler, återbetalningar</span>
                    </div>
                  </div>
                </label>

                <label className="checkbox-card">
                  <input 
                    type="checkbox"
                    checked={analysData.aktivaSektioner.milestones}
                    onChange={(e) => setAnalysData({
                      ...analysData, 
                      aktivaSektioner: {...analysData.aktivaSektioner, milestones: e.target.checked}
                    })}
                  />
                  <div className="checkbox-content">
                    <div className="checkbox-icon"><Target size={20} strokeWidth={1.5} /></div>
                    <div className="checkbox-label">
                      <strong>Milestones & Triggers</strong>
                      <span>Break-even, produktlansering, runway-mål</span>
                    </div>
                  </div>
                </label>

                <label className="checkbox-card">
                  <input
                    type="checkbox"
                    checked={analysData.aktivaSektioner.risk}
                    onChange={(e) => setAnalysData({
                      ...analysData,
                      aktivaSektioner: {...analysData.aktivaSektioner, risk: e.target.checked}
                    })}
                  />
                  <div className="checkbox-content">
                    <div className="checkbox-icon"><AlertTriangle size={20} strokeWidth={1.5} /></div>
                    <div className="checkbox-label">
                      <strong>Riskfaktorer</strong>
                      <span>Kundkoncentration, säkerhetsbuffert</span>
                    </div>
                  </div>
                </label>

                <label className="checkbox-card">
                  <input
                    type="checkbox"
                    checked={analysData.aktivaSektioner.generellPrognos}
                    onChange={(e) => setAnalysData({
                      ...analysData,
                      aktivaSektioner: {...analysData.aktivaSektioner, generellPrognos: e.target.checked}
                    })}
                  />
                  <div className="checkbox-content">
                    <div className="checkbox-icon"><BarChart2 size={20} strokeWidth={1.5} /></div>
                    <div className="checkbox-label">
                      <strong>Generell intäkts- och kostnadsprognos</strong>
                      <span>Övergripande förväntningar på intäkter, kostnader och lönsamhet</span>
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {analysData.aktivaSektioner.prognoser && (
              <div className="prognos-section">
                <h3><TrendingUp size={16} strokeWidth={1.5} /> Intäkts- och kostnadsprognoser</h3>
                
                <div className="form-group">
                  <label>Förväntad omsättningstillväxt per kvartal (%)</label>
                  <input 
                    type="number"
                    value={analysData.prognoser.omsättningstillväxt}
                    onChange={(e) => setAnalysData({
                      ...analysData, 
                      prognoser: {...analysData.prognoser, omsättningstillväxt: e.target.value}
                    })}
                    placeholder="T.ex. 15"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Antal nya anställningar planerade</label>
                    <input 
                      type="number"
                      value={analysData.prognoser.nyaAnställningar}
                      onChange={(e) => setAnalysData({
                        ...analysData, 
                        prognoser: {...analysData.prognoser, nyaAnställningar: e.target.value}
                      })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Genomsnittlig lön/anställd (TSEK/år)</label>
                    <input 
                      type="number"
                      value={analysData.prognoser.genomsnittslön}
                      onChange={(e) => setAnalysData({
                        ...analysData, 
                        prognoser: {...analysData.prognoser, genomsnittslön: e.target.value}
                      })}
                      placeholder="T.ex. 600"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Marknadsföringsinvesteringar (TSEK)</label>
                    <input 
                      type="number"
                      value={analysData.prognoser.marknadsföring}
                      onChange={(e) => setAnalysData({
                        ...analysData, 
                        prognoser: {...analysData.prognoser, marknadsföring: e.target.value}
                      })}
                    />
                  </div>
                  <div className="form-group">
                    <label>R&D-investeringar (TSEK)</label>
                    <input 
                      type="number"
                      value={analysData.prognoser.rndInvesteringar}
                      onChange={(e) => setAnalysData({
                        ...analysData, 
                        prognoser: {...analysData.prognoser, rndInvesteringar: e.target.value}
                      })}
                    />
                  </div>
                </div>
              </div>
            )}

            {analysData.aktivaSektioner.initiativ && (
              <div className="prognos-section">
                <h3><Zap size={16} strokeWidth={1.5} /> Strategiska initiativ</h3>
                
                <div className="form-group">
                  <label>Internationalisering / Expansion</label>
                  <textarea 
                    value={analysData.initiativ.internationalisering}
                    onChange={(e) => setAnalysData({
                      ...analysData, 
                      initiativ: {...analysData.initiativ, internationalisering: e.target.value}
                    })}
                    rows="2"
                    placeholder="T.ex. 'Öppna USA-kontor Q3 2025, uppskattat 15 MSEK'"
                  />
                </div>

                <div className="form-group">
                  <label>Planerade förvärv</label>
                  <textarea 
                    value={analysData.initiativ.förvärv}
                    onChange={(e) => setAnalysData({
                      ...analysData, 
                      initiativ: {...analysData.initiativ, förvärv: e.target.value}
                    })}
                    rows="2"
                    placeholder="T.ex. 'Målbolag X, uppskattat 50 MSEK'"
                  />
                </div>

                <div className="form-group">
                  <label>Produktlansering / Stora investeringar</label>
                  <textarea 
                    value={analysData.initiativ.produktlansering}
                    onChange={(e) => setAnalysData({
                      ...analysData, 
                      initiativ: {...analysData.initiativ, produktlansering: e.target.value}
                    })}
                    rows="2"
                    placeholder="T.ex. 'Produkt 2.0 lansering Q2 2025'"
                  />
                </div>
              </div>
            )}

            {analysData.aktivaSektioner.åtaganden && (
              <div className="prognos-section">
                <h3><Building2 size={16} strokeWidth={1.5} /> Finansiella åtaganden</h3>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Lån som förfaller (TSEK)</label>
                    <input 
                      type="number"
                      value={analysData.åtaganden.lånBelopp}
                      onChange={(e) => setAnalysData({
                        ...analysData, 
                        åtaganden: {...analysData.åtaganden, lånBelopp: e.target.value}
                      })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Datum för förfall</label>
                    <input 
                      type="date"
                      value={analysData.åtaganden.lånFörfaller}
                      onChange={(e) => setAnalysData({
                        ...analysData, 
                        åtaganden: {...analysData.åtaganden, lånFörfaller: e.target.value}
                      })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Konvertibler och andra åtaganden</label>
                  <textarea 
                    value={analysData.åtaganden.konvertibler}
                    onChange={(e) => setAnalysData({
                      ...analysData, 
                      åtaganden: {...analysData.åtaganden, konvertibler: e.target.value}
                    })}
                    rows="2"
                    placeholder="Beskriv konvertibler, earn-outs, etc."
                  />
                </div>
              </div>
            )}

            {analysData.aktivaSektioner.milestones && (
              <div className="prognos-section">
                <h3><Target size={16} strokeWidth={1.5} /> Milestones & Triggers</h3>
                
                <div className="form-group">
                  <label>När når ni break-even?</label>
                  <input 
                    type="text"
                    value={analysData.milestones.breakEven}
                    onChange={(e) => setAnalysData({
                      ...analysData, 
                      milestones: {...analysData.milestones, breakEven: e.target.value}
                    })}
                    placeholder="T.ex. 'Q2 2026'"
                  />
                </div>

                <div className="form-group">
                  <label>Önskad runway-marginal (månader)</label>
                  <input 
                    type="number"
                    value={analysData.milestones.önskadRunway}
                    onChange={(e) => setAnalysData({
                      ...analysData, 
                      milestones: {...analysData.milestones, önskadRunway: e.target.value}
                    })}
                  />
                </div>
              </div>
            )}

            {analysData.aktivaSektioner.risk && (
              <div className="prognos-section">
                <h3><AlertTriangle size={16} strokeWidth={1.5} /> Riskfaktorer</h3>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Kundkoncentration (% från största kund)</label>
                    <input 
                      type="number"
                      value={analysData.risk.kundkoncentration}
                      onChange={(e) => setAnalysData({
                        ...analysData, 
                        risk: {...analysData.risk, kundkoncentration: e.target.value}
                      })}
                      placeholder="T.ex. 35"
                    />
                  </div>
                  <div className="form-group">
                    <label>Önskad säkerhetsbuffert (%)</label>
                    <input 
                      type="number"
                      value={analysData.risk.säkerhetsbuffert}
                      onChange={(e) => setAnalysData({
                        ...analysData, 
                        risk: {...analysData.risk, säkerhetsbuffert: e.target.value}
                      })}
                    />
                  </div>
                </div>
              </div>
            )}

            {analysData.aktivaSektioner.generellPrognos && (
              <div className="prognos-section">
                <h3><BarChart2 size={16} strokeWidth={1.5} /> Generell intäkts- och kostnadsprognos</h3>
                <p className="section-description">
                  Beskriv er förväntade intäkts- och kostnadsutveckling i generella termer.
                </p>

                <div className="form-row">
                  <div className="form-group">
                    <label>Intäktsförändring kommande 12 mån (+/-, %)</label>
                    <input
                      type="number"
                      value={analysData.generellPrognos.intäktsförändring}
                      onChange={(e) => setAnalysData({
                        ...analysData,
                        generellPrognos: {...analysData.generellPrognos, intäktsförändring: e.target.value}
                      })}
                      placeholder="T.ex. +15 eller -5"
                    />
                  </div>
                  <div className="form-group">
                    <label>Kostnadsförändring kommande 12 mån (+/-, %)</label>
                    <input
                      type="number"
                      value={analysData.generellPrognos.kostnadsförändring}
                      onChange={(e) => setAnalysData({
                        ...analysData,
                        generellPrognos: {...analysData.generellPrognos, kostnadsförändring: e.target.value}
                      })}
                      placeholder="T.ex. +10 eller -3"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="selected-sections-summary">
              <h4>Valt att komplettera:</h4>
              <div className="summary-tags">
                {analysData.aktivaSektioner.prognoser && <span className="tag"><TrendingUp size={12} strokeWidth={1.5} /> Prognoser</span>}
                {analysData.aktivaSektioner.initiativ && <span className="tag"><Zap size={12} strokeWidth={1.5} /> Initiativ</span>}
                {analysData.aktivaSektioner.åtaganden && <span className="tag"><Building2 size={12} strokeWidth={1.5} /> Åtaganden</span>}
                {analysData.aktivaSektioner.milestones && <span className="tag"><Target size={12} strokeWidth={1.5} /> Milestones</span>}
                {analysData.aktivaSektioner.risk && <span className="tag"><AlertTriangle size={12} strokeWidth={1.5} /> Risk</span>}
                {analysData.aktivaSektioner.generellPrognos && <span className="tag"><BarChart2 size={12} strokeWidth={1.5} /> Generell prognos</span>}
                {!Object.values(analysData.aktivaSektioner).some(v => v) && (
                  <span className="tag tag-empty">
                    Ingen sektion vald — AI baserar analys endast på finansiell data
                  </span>
                )}
              </div>
            </div>

            <div className="button-row">
              <button className="btn-secondary" onClick={() => setStep('granska-data')}>
                <ChevronLeft size={16} strokeWidth={1.5} /> Tillbaka
              </button>
              <button className="btn-primary" onClick={() => setStep('börsdata')}>
                Fortsätt till Börsdata <ChevronRight size={14} strokeWidth={1.5} />
              </button>
            </div>
          </div>
        )}

        {step === 'analys' && (
          <div className="analys-form">
            <h2><Sparkles size={18} strokeWidth={1.5} /> AI Kapitalbehovsanalys</h2>
            <p>AI analyserar era förutsättningar och ger en skräddarsydd emissionsrekommendation.</p>

            <div className="data-summary" style={{background: '#f7fafc', border: '2px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem', margin: '1.5rem 0'}}>
              <h3><ClipboardList size={16} strokeWidth={1.5} /> Finansiell data som skickas till AI</h3>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem'}}>
                <div><strong>Kassa:</strong> {finansiellData.kassa || '-'} TSEK</div>
                <div><strong>Burn rate:</strong> {analysData.companyData.burnRate || '-'} TSEK/mån</div>
                <div><strong>Runway:</strong> {analysData.companyData.runway || '-'} månader</div>
                <div><strong>Eget kapital:</strong> {finansiellData.egetKapital || '-'} TSEK</div>
                <div><strong>Skulder:</strong> {finansiellData.skulder || '-'} TSEK</div>
                <div><strong>Aktiva sektioner:</strong> {Object.entries(analysData.aktivaSektioner).filter(([,v]) => v).map(([k]) => k).join(', ') || 'Inga'}</div>
              </div>
            </div>

            {!generatedAnalys && (
              <button
                className="btn-primary btn-large"
                onClick={handleGenerateAnalys}
                disabled={loading}
                style={{width: '100%', marginBottom: '1.5rem'}}
              >
                {loading ? <><Loader size={14} strokeWidth={1.5} /> AI analyserar...</> : <><Sparkles size={14} strokeWidth={1.5} /> Generera AI-analys</>}
              </button>
            )}

            {generatedAnalys && (
              <div className="generated-content">
                <h3><BarChart2 size={16} strokeWidth={1.5} /> AI Analysresultat</h3>
                <div className="analys-text">{generatedAnalys}</div>
                <button 
                  className="btn-secondary" 
                  onClick={() => { setGeneratedAnalys(''); }}
                  style={{marginTop: '1rem'}}
                >
                  <RefreshCw size={14} strokeWidth={1.5} /> Generera ny analys
                </button>
              </div>
            )}
            
            <div className="button-row">
              <button className="btn-secondary" onClick={() => setStep('börsdata')}><ChevronLeft size={16} strokeWidth={1.5} /> Tillbaka</button>
              <button
                className="btn-primary"
                onClick={() => {
                  if (stockData) generateAutoEmissionTerms();
                  setStep('villkor');
                }}
              >
                Fortsätt till Emissionsvillkor <ChevronRight size={14} strokeWidth={1.5} />
              </button>
            </div>
          </div>
        )}

        {step === 'börsdata' && (
          <div className="borsdata-step">
            <h2>Emissionsparametrar & Börsdata</h2>
            <p>Hämta automatisk börsdata för att optimera emissionsvillkoren</p>

            <div className="ticker-section">
              <h3><BarChart2 size={16} strokeWidth={1.5} /> Hämta börsdata</h3>
              <div className="form-row">
                <div className="form-group" style={{flex: 2}}>
                  <label>Ticker-symbol</label>
                  <input
                    type="text"
                    value={ticker}
                    onChange={(e) => setTicker(e.target.value.toUpperCase())}
                    placeholder="T.ex. MINEST"
                  />
                  <small style={{color: '#718096', display: 'block', marginTop: '0.5rem'}}>
                    Provar First North, Spotlight (.ST) och Nordic SME (.NGM) automatiskt
                  </small>
                </div>
                <div style={{display: 'flex', alignItems: 'flex-end'}}>
                  <button 
                    className="btn-primary"
                    onClick={handleFetchStockData}
                    disabled={fetchingStock || !ticker}
                  >
                    {fetchingStock ? 'Hämtar...' : <><Search size={14} strokeWidth={1.5} /> Hämta börsdata</>}
                  </button>
                </div>
              </div>
            </div>

            {stockData && (
              <div className="stock-data-display">
                <h3><CheckCircle2 size={16} strokeWidth={1.5} /> Börsdata hämtad {stockData.demo && '(Demo)'}{stockData.source === 'avanza' && ' (Avanza)'}</h3>
                
                <div className="stock-metrics">
                  <div className="stock-metric-card">
                    <div className="metric-label">Senaste kurs</div>
                    <div className="metric-value">
                      {stockData.price.toFixed(2)} {stockData.currency}
                    </div>
                    <div 
                      className="metric-change" 
                      style={{color: stockData.change >= 0 ? '#48bb78' : '#f56565'}}
                    >
                      {stockData.change >= 0 ? '↑' : '↓'} 
                      {Math.abs(stockData.change).toFixed(2)} 
                      ({stockData.changePercent.toFixed(2)}%)
                    </div>
                  </div>

                  <div className="stock-metric-card">
                    <div className="metric-label">Utestående aktier</div>
                    <div className="metric-value">
                      {stockData.sharesOutstanding ? stockData.sharesOutstanding.toLocaleString('sv-SE') : '–'}
                    </div>
                  </div>

                  <div className="stock-metric-card">
                    <div className="metric-label">Börsvärde</div>
                    <div className="metric-value">
                      {stockData.marketCap ? `${(stockData.marketCap / 1000000).toFixed(1)} MSEK` : '–'}
                    </div>
                  </div>

                  <div className="stock-metric-card">
                    <div className="metric-label">Senaste handel</div>
                    <div className="metric-value" style={{fontSize: '1rem'}}>
                      {new Date(stockData.updatedAt).toLocaleString('sv-SE')}
                    </div>
                  </div>
                </div>

                <div className="ai-recommendations">
                  <h3><Sparkles size={16} strokeWidth={1.5} /> AI-rekommendationer</h3>
                  <p>Baserat på ert kapitalbehov och bolagets börsvärde</p>

                  <div className="recommendation-grid">
                    <div className="recommendation-card">
                      <div className="rec-icon">💰</div>
                      <div className="rec-content">
                        <strong>Rekommenderad rabatt</strong>
                        <div className="rec-value">{emissionsParametrar.rabatt}%</div>
                        <p>Standard för er bransch och situation</p>
                      </div>
                    </div>

                    <div className="recommendation-card">
                      <div className="rec-icon"><BarChart2 size={20} strokeWidth={1.5} /></div>
                      <div className="rec-content">
                        <strong>Rekommenderad max spädning</strong>
                        <div className="rec-value">{emissionsParametrar.maxSpädning}%</div>
                        <p>
                          Kapitalbehov/Börsvärde: {
                            stockData.marketCap
                              ? `${((parseInt(analysData.companyData.currentCapital || 0) * 1000 / stockData.marketCap) * 100).toFixed(0)}%`
                              : '–'
                          }
                        </p>
                      </div>
                    </div>

                    <div className="recommendation-card">
                      <div className="rec-icon"><Target size={20} strokeWidth={1.5} /></div>
                      <div className="rec-content">
                        <strong>Rekommenderade teckningsrätter</strong>
                        <div className="rec-value">{emissionsParametrar.teckningsrätter}</div>
                        <p>För företrädesemission</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="adjust-parameters">
                  <h3><SlidersHorizontal size={16} strokeWidth={1.5} /> Justera parametrar (valfritt)</h3>
                  <p>AI-rekommendationerna förifyllda. Justera om ni vill.</p>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Önskad rabatt (%)</label>
                      <input 
                        type="number"
                        min="0"
                        max="50"
                        value={emissionsParametrar.rabatt}
                        onChange={(e) => setEmissionsParametrar({
                          ...emissionsParametrar, 
                          rabatt: parseInt(e.target.value)
                        })}
                      />
                      <small style={{color: '#718096'}}>Standard: 15-25%</small>
                    </div>

                    <div className="form-group">
                      <label>Max spädning (%)</label>
                      <input 
                        type="number"
                        min="0"
                        max="100"
                        value={emissionsParametrar.maxSpädning}
                        onChange={(e) => setEmissionsParametrar({
                          ...emissionsParametrar, 
                          maxSpädning: parseInt(e.target.value)
                        })}
                      />
                      <small style={{color: '#718096'}}>Hur mycket dilution accepteras?</small>
                    </div>

                    <div className="form-group">
                      <label>Teckningsrätter</label>
                      <input 
                        type="text"
                        value={emissionsParametrar.teckningsrätter}
                        onChange={(e) => setEmissionsParametrar({
                          ...emissionsParametrar, 
                          teckningsrätter: e.target.value
                        })}
                        placeholder="T.ex. 1:5"
                      />
                      <small style={{color: '#718096'}}>
                        Format: 1:X (1:5 = varje 5 gamla aktier ger rätt till 1 ny)
                      </small>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {!stockData && (
              <div className="info-box" style={{background: '#f0f7ff', border: '1px solid #c8ddf5', borderRadius: '8px', padding: '24px', marginBottom: '24px'}}>
                <p><strong><Lightbulb size={14} strokeWidth={1.5} /> Varför hämta börsdata?</strong></p>
                <p>Med börsdata kan AI automatiskt:</p>
                <ul style={{marginLeft: '1.5rem', marginTop: '0.5rem'}}>
                  <li>Föreslå optimal teckningskurs (med lämplig rabatt)</li>
                  <li>Beräkna antal nya aktier baserat på kapitalbehov</li>
                  <li>Rekommendera teckningsrätter</li>
                  <li>Varna om spädning blir för stor</li>
                </ul>
              </div>
            )}

            <div className="manual-stock-section" style={{background: '#f7fafc', border: '2px solid #e2e8f0', borderRadius: '12px', padding: '2rem', marginBottom: '24px'}}>
              <h3>{stockData ? '✏️ Ändra/korrigera manuellt' : '✏️ Eller ange manuellt'}</h3>
              <p style={{color: '#718096', marginBottom: '1rem'}}>{stockData ? 'Vill du korrigera aktiekurs eller antal aktier? Ange nya värden nedan.' : 'Om du inte har en ticker-symbol kan du ange aktiekurs och antal aktier manuellt.'}</p>
              <div className="form-row">
                <div className="form-group">
                  <label>Aktiekurs (SEK)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    id="manual-price" 
                    placeholder="T.ex. 2.84"
                  />
                </div>
                <div className="form-group">
                  <label>Utestående aktier</label>
                  <input
                    type="number"
                    id="manual-shares"
                    placeholder="T.ex. 25000000"
                  />
                </div>
              </div>
                <div className="form-group" style={{marginTop: '1rem'}}>
                  <label>Bolagsstämmans bemyndigande (antal aktier)</label>
                  <input
                    type="number"
                    value={bemyndigande}
                    onChange={(e) => setBemyndigande(e.target.value)}
                    placeholder="T.ex. 5000000"
                  />
                  <small style={{color: '#718096', display: 'block', marginTop: '0.25rem'}}>
                    Antal nya aktier styrelsen är bemyndigad att ge ut utan ny bolagsstämma
                  </small>
                </div>
              <button 
                className="btn-primary" 
                style={{marginTop: '1rem'}}
                onClick={() => {
                  const price = parseFloat(document.getElementById('manual-price').value);
                  const shares = parseInt(document.getElementById('manual-shares').value);
                  if (!price || !shares) { alert('Ange både aktiekurs och antal aktier'); return; }
                  const manualData = {
                    ticker: 'MANUELL',
                    price,
                    currency: 'SEK',
                    sharesOutstanding: shares,
                    marketCap: price * shares,
                    previousClose: price,
                    change: 0,
                    changePercent: 0,
                    updatedAt: new Date().toISOString(),
                    manual: true
                  };
                  setStockData(manualData);
                  
                  const kassaTSEK = parseInt(analysData.companyData.currentCapital) || 20000;
                  const kapitalbehovSEK = kassaTSEK * 1000;
                  const ratio = kapitalbehovSEK / manualData.marketCap;
                  let rabatt = 20, spädning = 38, tr = '1:2';
                  if (ratio > 1.5) { rabatt = 25; spädning = 45; tr = '1:1'; }
                  else if (ratio < 0.5) { rabatt = 15; spädning = 30; tr = '1:4'; }
                  setEmissionsParametrar({ rabatt, maxSpädning: spädning, teckningsrätter: tr });
                  alert('Manuella värden sparade!');
                }}
              >
                <CheckCircle2 size={14} strokeWidth={1.5} /> Använd manuella värden
              </button>
            </div>

            {stockData && bemyndigande && (() => {
              const burnRateTSEK = parseFloat(analysData.companyData.burnRate) || 0;
              const kassaTSEK = parseFloat(finansiellData.kassa) || 0;
              const önskadRunway = parseFloat(analysData.milestones?.önskadRunway) || 18;
              const behovTSEK = Math.max(0, (burnRateTSEK * önskadRunway) - kassaTSEK);
              const behovSEK = behovTSEK * 1000;
              const teckningskurs = stockData.price * 0.8;
              const behovdaAktier = teckningskurs > 0 ? Math.round(behovSEK / teckningskurs) : 0;
              const mandatAktier = parseInt(bemyndigande) || 0;
              const räcker = mandatAktier >= behovdaAktier;
              return (
                <div style={{
                  background: räcker ? '#f0fff4' : '#fff5f5',
                  border: `2px solid ${räcker ? '#48bb78' : '#f56565'}`,
                  borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem'
                }}>
                  <strong>{räcker ? <><CheckCircle2 size={14} strokeWidth={1.5} /> Bemyndigandet räcker</> : <><AlertTriangle size={14} strokeWidth={1.5} /> Bemyndigandet räcker INTE</>}</strong>
                  <div style={{marginTop: '0.5rem', fontSize: '0.9rem'}}>
                    <div>Beräknat behov: ~{behovdaAktier.toLocaleString('sv-SE')} nya aktier (vid 20% rabatt)</div>
                    <div>Bemyndigande: {mandatAktier.toLocaleString('sv-SE')} aktier</div>
                    {!räcker && <div style={{color: '#c53030', marginTop: '0.5rem', fontWeight: 600}}>
                      En extra bolagsstämma krävs innan emission kan genomföras.
                    </div>}
                  </div>
                </div>
              );
            })()}

            <div className="button-row">
              <button className="btn-secondary" onClick={() => setStep('prognoser')}>
                <ChevronLeft size={16} strokeWidth={1.5} /> Tillbaka
              </button>
              <button
                className="btn-primary"
                onClick={() => setStep('analys')}
              >
                {stockData ? <>Fortsätt till AI-analys <ChevronRight size={14} strokeWidth={1.5} /></> : <>Hoppa över börsdata <ChevronRight size={14} strokeWidth={1.5} /></>}
              </button>
            </div>
          </div>
        )}

        {step === 'villkor' && (
          <div className="villkor-form">
            <h2>Emissionsvillkor</h2>
            {generatedAnalys && (
              <div className="generated-content">
                <h3><BarChart2 size={16} strokeWidth={1.5} /> Analysresultat</h3>
                <div className="analys-text">{generatedAnalys}</div>
              </div>
            )}
            
            <h3>Ange emissionsvillkor</h3>
            <div className="form-group">
              <label>Typ av emission</label>
              <select 
                value={emissionsvillkor.typ}
                onChange={(e) => setEmissionsvillkor({...emissionsvillkor, typ: e.target.value})}
              >
                <option>Företrädesemission</option>
                <option>Nyemission</option>
                <option>Riktad emission</option>
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Teckningskurs (SEK)</label>
                <input 
                  type="number"
                  step="0.01"
                  value={emissionsvillkor.teckningskurs}
                  onChange={(e) => setEmissionsvillkor({...emissionsvillkor, teckningskurs: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Antal nya aktier</label>
                <input 
                  type="number"
                  value={emissionsvillkor.antalNyaAktier}
                  onChange={(e) => {
                    const antal = e.target.value;
                    const volym = antal * emissionsvillkor.teckningskurs;
                    setEmissionsvillkor({...emissionsvillkor, antalNyaAktier: antal, emissionsvolym: volym});
                  }}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Emissionsvolym (SEK) - Beräknas automatiskt</label>
              <input 
                type="number"
                value={emissionsvillkor.emissionsvolym}
                readOnly
                style={{background: '#f0f0f0'}}
              />
            </div>

            {emissionsvillkor.typ === 'Företrädesemission' && (
              <div className="form-group">
                <label>Teckningsrätter</label>
                <input 
                  type="text"
                  value={emissionsvillkor.teckningsrätter}
                  onChange={(e) => setEmissionsvillkor({...emissionsvillkor, teckningsrätter: e.target.value})}
                  placeholder="T.ex. 1:5"
                />
              </div>
            )}

            <div className="button-row">
              <button className="btn-secondary" onClick={() => setStep('analys')}><ChevronLeft size={16} strokeWidth={1.5} /> Tillbaka</button>
              <button
                className="btn-primary"
                onClick={handleCreateProject}
                disabled={!emissionsvillkor.teckningskurs || !emissionsvillkor.antalNyaAktier}
              >
                Skapa emissionsprojekt <ChevronRight size={14} strokeWidth={1.5} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Kapitalrådgivaren;
