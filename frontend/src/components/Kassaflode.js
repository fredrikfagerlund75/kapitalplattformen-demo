// frontend/src/components/Kassaflode.js

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { apiGet, apiPost, apiDelete } from '../utils/api';
import './Kassaflode.css';

// ─── Chart.js via CDN ─────────────────────────────────────────────────────────
let chartJsLoading = false;
function loadChartJs(cb) {
  if (window.Chart) { cb(); return; }
  if (chartJsLoading) { const t = setInterval(() => { if (window.Chart) { clearInterval(t); cb(); } }, 50); return; }
  chartJsLoading = true;
  const s = document.createElement('script');
  s.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js';
  s.onload = cb;
  document.head.appendChild(s);
}

// ─── Beräkningshjälpare ───────────────────────────────────────────────────────
const n = v => Number(v) || 0;
function calcKassa(d)   { return n(d.ing_kassa)+n(d.omsattning)+n(d.ovrigt_in)+n(d.externt_kapital)-n(d.produktionskost)-n(d.personalkost)-n(d.externa_kost)+n(d.capex); }
function calcRorelse(d) { return n(d.omsattning)-n(d.produktionskost)-n(d.personalkost)-n(d.externa_kost); }
function calcGM(d)      { return n(d.omsattning)>0 ? (n(d.omsattning)-n(d.produktionskost))/n(d.omsattning)*100 : null; }
function calcEBIT(d)    { return n(d.omsattning)>0 ? calcRorelse(d)/n(d.omsattning)*100 : null; }
function calcBurnAvg(months) {
  if (!months.length) return null;
  return months.slice(-3).reduce((s,d)=>s+calcRorelse(d),0)/Math.min(3,months.length);
}
function calcRunway(months) {
  if (!months.length) return null;
  const burn = calcBurnAvg(months);
  if (burn >= 0) return 99;
  const kassa = calcKassa(months[months.length-1]);
  return Math.max(0, Math.floor(kassa/Math.abs(burn)));
}
function calcCapexQ(months) {
  return months.slice(-3).reduce((s,d)=>s+Math.abs(n(d.capex)),0);
}
function fmtSEK(v)  { return Math.round(Number(v)).toLocaleString('sv-SE'); }
function fmtPct(v)  { return v===null ? '–' : Math.round(v)+'%'; }
function periodLabel(p) {
  const [y,m] = p.split('-');
  return ['Jan','Feb','Mar','Apr','Maj','Jun','Jul','Aug','Sep','Okt','Nov','Dec'][parseInt(m,10)-1]+' '+y;
}

// ─── Avvikelsehjälpare ────────────────────────────────────────────────────────
function variance(actual, target, higherIsBetter = true) {
  if (actual === null || target === null) return null;
  const diff = actual - target;
  const diffPct = target !== 0 ? diff/Math.abs(target)*100 : null;
  let status;
  const sign = higherIsBetter ? 1 : -1;
  if (diff*sign >= 0) status = 'ok';
  else if (Math.abs(diffPct) <= 10) status = 'warn';
  else status = 'danger';
  return { val: actual, target, diff, diffPct, status };
}

const EMPTY_FORM = { period:'', omsattning:'', ovrigt_in:'', ing_kassa:'', produktionskost:'', personalkost:'', externa_kost:'', capex:'', externt_kapital:'' };
const EMPTY_TARGETS = { label:'Budget 12 mån', omsattning_tillvaxt:'', bruttomarginal:'', rorelsemarginal:'', burn_rate_max:'', runway_min:'', capex_budget:'', betalningstid_dagar:'', avskrivningstakt:'', aktiveringsgrad:'' };

// ─────────────────────────────────────────────────────────────────────────────
export default function Kassaflode({ companyId }) {
  const [tab, setTab]             = useState('oversikt');
  const [months, setMonths]       = useState([]);
  const [targets, setTargets]     = useState(null);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [tForm, setTForm]         = useState(EMPTY_TARGETS);
  const [saving, setSaving]       = useState(false);
  const [savingT, setSavingT]     = useState(false);
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [deleteId, setDeleteId]   = useState(null);
  const [notification, setNotif]  = useState(null);

  const chartKassaRef  = useRef(null);
  const chartMarginRef = useRef(null);
  const chartWfRef     = useRef(null);
  const chartVarRef    = useRef(null);
  const chartInst      = useRef({});

  const loadMonths = useCallback(async () => {
    if (!companyId) return;
    try {
      const r = await apiGet(`/api/cashflow?company_id=${companyId}`);
      if (!r.ok) return;
      setMonths(await r.json());
    }
    catch(e) { console.error(e); }
  }, [companyId]);

  const loadTargets = useCallback(async () => {
    if (!companyId) return;
    try {
      const r = await apiGet(`/api/cashflow/targets?company_id=${companyId}`);
      if (!r.ok) return;
      const t = await r.json();
      setTargets(t);
      if (t) setTForm({ ...EMPTY_TARGETS, ...Object.fromEntries(Object.entries(t).map(([k,v])=>[k, v===null?'':v])) });
    } catch(e) { console.error(e); }
  }, [companyId]);

  useEffect(() => { loadMonths(); loadTargets(); }, [loadMonths, loadTargets]);

  useEffect(() => {
    if (tab !== 'oversikt' || months.length === 0) return;
    loadChartJs(() => buildCharts(months, targets));
    return () => destroyCharts();
  }, [tab, months, targets]); // eslint-disable-line react-hooks/exhaustive-deps

  function destroyCharts() {
    Object.values(chartInst.current).forEach(c => { try { c.destroy(); } catch(_){} });
    chartInst.current = {};
  }

  function buildCharts(data, tgts) {
    destroyCharts();
    const labels   = data.map(d => periodLabel(d.period));
    const kassaV   = data.map(d => Math.round(calcKassa(d)));
    const gmV      = data.map(d => { const v=calcGM(d); return v!==null?Math.round(v):null; });
    const ebitV    = data.map(d => { const v=calcEBIT(d); return v!==null?Math.round(v):null; });
    const burn     = calcBurnAvg(data)||0;
    const lastK    = kassaV[kassaV.length-1];
    const monthsToZero = (burn < 0) ? Math.ceil(Math.abs(lastK / burn)) : 3;
    const forecastMonths = Math.min(monthsToZero, 36);
    const progLbls = Array.from({ length: forecastMonths }, (_, i) => `(+${i+1} mån)`);
    const progV    = Array.from({ length: forecastMonths }, (_, i) => Math.max(0, Math.round(lastK + (i+1) * burn)));

    if (chartKassaRef.current) {
      chartInst.current.kassa = new window.Chart(chartKassaRef.current, {
        type: 'line',
        data: {
          labels: [...labels,...progLbls],
          datasets: [
            { label:'Utfall',  data:[...kassaV,...progLbls.map(()=>null)], borderColor:'#378add', backgroundColor:'rgba(55,138,221,0.07)', tension:0.3, pointRadius:3, fill:true },
            { label:'Prognos', data:[...kassaV.map(()=>null),lastK,...progV], borderColor:'#e24b4a', borderDash:[4,3], tension:0.3, pointRadius:3, fill:false }
          ]
        },
        options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{ y:{ticks:{callback:v=>fmtSEK(v)}}, x:{ticks:{autoSkip:false,maxRotation:45,font:{size:10}}} } }
      });
    }

    if (chartMarginRef.current) {
      const datasets = [
        { label:'Bruttomarginal',  data:gmV,   borderColor:'#639922', tension:0.3, pointRadius:3 },
        { label:'Rörelsemarginal', data:ebitV,  borderColor:'#e24b4a', borderDash:[3,2], tension:0.3, pointRadius:3 }
      ];
      if (tgts?.bruttomarginal) datasets.push({ label:'Mål BM',  data:labels.map(()=>n(tgts.bruttomarginal)),  borderColor:'#639922', borderDash:[6,3], pointRadius:0, borderWidth:1 });
      if (tgts?.rorelsemarginal) datasets.push({ label:'Mål ROM', data:labels.map(()=>n(tgts.rorelsemarginal)), borderColor:'#e24b4a', borderDash:[6,3], pointRadius:0, borderWidth:1 });
      chartInst.current.margin = new window.Chart(chartMarginRef.current, {
        type:'line', data:{ labels, datasets },
        options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{ y:{ticks:{callback:v=>v+'%'}}, x:{ticks:{autoSkip:false,maxRotation:45,font:{size:10}}} } }
      });
    }

    if (chartWfRef.current && data.length>0) {
      const last   = data[data.length-1];
      const wfLbls = ['Omsättning','Prod.kost','Personal','Externa','CAPEX','Ext. kapital'];
      const wfV    = [n(last.omsattning),-n(last.produktionskost),-n(last.personalkost),-n(last.externa_kost),n(last.capex),n(last.externt_kapital)];
      chartInst.current.wf = new window.Chart(chartWfRef.current, {
        type:'bar', data:{ labels:wfLbls, datasets:[{ data:wfV, backgroundColor:wfV.map(v=>v>=0?'#639922':'#e24b4a'), borderRadius:4 }] },
        options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{ y:{ticks:{callback:v=>fmtSEK(v)}}, x:{ticks:{font:{size:11},autoSkip:false}} } }
      });
    }

    if (chartVarRef.current && tgts && data.length>0) {
      const last    = data[data.length-1];
      const lastGM  = calcGM(last);
      const lastEB  = calcEBIT(last);
      const lastBrn = calcBurnAvg(data);
      const varItems = [
        { label:'Bruttomarginal',  actual:lastGM,          target:n(tgts.bruttomarginal)||null,  higherIsBetter:true },
        { label:'Rörelsemarginal', actual:lastEB,          target:n(tgts.rorelsemarginal)||null,  higherIsBetter:true },
        { label:'Burn rate',       actual:lastBrn,         target:n(tgts.burn_rate_max)||null,    higherIsBetter:false },
        { label:'Runway',          actual:calcRunway(data),target:n(tgts.runway_min)||null,       higherIsBetter:true },
      ].filter(i=>i.target!==null && i.actual!==null);

      if (varItems.length>0) {
        const vDiffs = varItems.map(i => { const d=i.actual-i.target; return i.higherIsBetter?d:-d; });
        chartInst.current.var = new window.Chart(chartVarRef.current, {
          type:'bar',
          data:{ labels:varItems.map(i=>i.label), datasets:[{ data:vDiffs, backgroundColor:vDiffs.map(v=>v>=0?'rgba(99,153,34,0.7)':'rgba(226,75,74,0.7)'), borderRadius:4 }] },
          options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}, tooltip:{callbacks:{label:ctx=>(ctx.raw>=0?'+':'')+Math.round(ctx.raw*10)/10}}}, scales:{ y:{ticks:{callback:v=>(v>=0?'+':'')+Math.round(v)}}, x:{ticks:{font:{size:11}}} } }
        });
      }
    }
  }

  const runway    = calcRunway(months);
  const lastMonth = months.length>0 ? months[months.length-1] : null;
  const prevMonth = months.length>1 ? months[months.length-2] : null;
  const lastKassa = lastMonth ? Math.round(calcKassa(lastMonth)) : null;
  const prevKassa = prevMonth ? Math.round(calcKassa(prevMonth)) : null;
  const avgBurn   = calcBurnAvg(months);
  const lastGM    = lastMonth ? calcGM(lastMonth) : null;
  const prevGM    = prevMonth ? calcGM(prevMonth) : null;
  const lastEBIT  = lastMonth ? calcEBIT(lastMonth) : null;

  const variances = targets ? [
    { label:'Bruttomarginal',  unit:'%',        v: variance(lastGM!==null?Math.round(lastGM):null,    n(targets.bruttomarginal)||null, true) },
    { label:'Rörelsemarginal', unit:'%',        v: variance(lastEBIT!==null?Math.round(lastEBIT):null, n(targets.rorelsemarginal)||null, true) },
    { label:'Burn rate',       unit:'kSEK/mån', v: variance(avgBurn!==null?Math.round(avgBurn):null,   n(targets.burn_rate_max)||null, false) },
    { label:'Runway',          unit:'mån',      v: variance(runway===99?null:runway,                   n(targets.runway_min)||null, true) },
    { label:'CAPEX/kvartal',   unit:'kSEK',     v: variance(-calcCapexQ(months),                       -(n(targets.capex_budget)||0)||null, false) },
  ].filter(x=>x.v!==null) : [];

  const fv = k => parseFloat(form[k])||0;
  const formNetto = fv('omsattning')+fv('ovrigt_in')+fv('externt_kapital')-fv('produktionskost')-fv('personalkost')-fv('externa_kost')+fv('capex');
  const formGM    = fv('omsattning')>0 ? Math.round((fv('omsattning')-fv('produktionskost'))/fv('omsattning')*100) : null;

  async function handleSave() {
    if (!form.period) { notify('Välj en period.','warn'); return; }
    setSaving(true);
    try {
      const r = await apiPost('/api/cashflow', { company_id:companyId, ...form });
      if (!r.ok) throw new Error('save failed');
      await loadMonths();
      setForm(EMPTY_FORM);
      setTab('oversikt');
      notify('Månad sparad!','ok');
    } catch { notify('Kunde inte spara.','danger'); }
    finally { setSaving(false); }
  }

  async function handleSaveTargets() {
    setSavingT(true);
    try {
      const r = await apiPost('/api/cashflow/targets', { company_id:companyId, ...tForm });
      if (!r.ok) throw new Error('save failed');
      await loadTargets();
      notify('Mål sparade!','ok');
    } catch { notify('Kunde inte spara mål.','danger'); }
    finally { setSavingT(false); }
  }

  async function handleDemo() {
    setLoadingDemo(true);
    try {
      const r = await apiPost('/api/cashflow/demo', { company_id:companyId });
      if (!r.ok) throw new Error('demo failed');
      await Promise.all([loadMonths(), loadTargets()]);
      setForm(EMPTY_FORM);
      setTForm(EMPTY_TARGETS);
      setTab('oversikt');
      notify('6 månaders exempeldata + mål inlagda!','ok');
    } catch { notify('Kunde inte fylla i exempeldata.','danger'); }
    finally { setLoadingDemo(false); }
  }

  async function handleReset() {
    if (!window.confirm('Radera all kassaflödesdata för detta företag?')) return;
    try {
      const r = await apiDelete(`/api/cashflow/reset?company_id=${companyId}`);
      if (!r.ok) throw new Error();
      setMonths([]);
      setTargets(null);
      setForm(EMPTY_FORM);
      setTForm(EMPTY_TARGETS);
      setTab('oversikt');
      notify('All kassaflödesdata raderad.','ok');
    } catch { notify('Kunde inte återställa data.','danger'); }
  }

  async function handleDelete(id) {
    try {
      await apiDelete(`/api/cashflow/${id}`);
      await loadMonths();
      setDeleteId(null);
      notify('Månad borttagen.','ok');
    } catch { notify('Kunde inte ta bort.','danger'); }
  }

  function notify(msg, type='ok') {
    setNotif({msg,type});
    setTimeout(()=>setNotif(null),3500);
  }

  const alertLevel = runway!==null && runway<3 ? 'danger' : runway!==null && runway<6 ? 'warn' : null;

  return (
    <div className="kf-page">
      {notification && <div className={`kf-notification kf-notif-${notification.type}`}>{notification.msg}</div>}

      <div className="kf-header">
        <h1 className="kf-title">Kassaflöde</h1>
        {runway!==null && (
          <span className={`kf-badge kf-badge-${runway>=6?'ok':runway>=3?'warn':'danger'}`}>
            {runway>=99?'Runway: stabil':`Runway: ${runway} mån`}
          </span>
        )}
      </div>

      {alertLevel && (
        <div className={`kf-alert kf-alert-${alertLevel}`}>
          <span className="kf-alert-icon">{alertLevel==='danger'?'⚠':'!'}</span>
          <div>
            {alertLevel==='danger'
              ? <><strong>Kritisk likviditet</strong> — kassaprognosen visar underskott inom 3 månader. Kapitalförstärkning är nödvändig.</>
              : <><strong>Runway {runway} månader</strong> — överväg att inleda kapitalförberedelser nu.</>}
          </div>
        </div>
      )}

      {months.length>0 && (
        <div className="kf-kpi-grid">
          <div className="kf-kpi">
            <div className="kf-kpi-label">Kassa (senaste)</div>
            <div className={`kf-kpi-val ${lastKassa<1500?'danger':lastKassa<2500?'warn':'ok'}`}>{lastKassa!==null?fmtSEK(lastKassa)+' kSEK':'–'}</div>
            {prevKassa!==null && <div className="kf-kpi-sub">{lastKassa-prevKassa>=0?'+':''}{fmtSEK(lastKassa-prevKassa)} vs föregående</div>}
          </div>
          <div className="kf-kpi">
            <div className="kf-kpi-label">Burn rate (snitt 3 mån)</div>
            <div className={`kf-kpi-val ${avgBurn!==null&&avgBurn<0?'warn':'ok'}`}>{avgBurn!==null?(avgBurn>=0?'+':'')+fmtSEK(avgBurn)+' kSEK/mån':'–'}</div>
            <div className="kf-kpi-sub">Rörelsekassaflöde</div>
          </div>
          <div className="kf-kpi">
            <div className="kf-kpi-label">Bruttomarginal</div>
            <div className={`kf-kpi-val ${lastGM!==null&&lastGM>=40?'ok':'warn'}`}>{fmtPct(lastGM!==null?Math.round(lastGM):null)}</div>
            {prevGM!==null&&lastGM!==null&&<div className="kf-kpi-sub">{Math.round(lastGM-prevGM)>=0?'+':''}{Math.round(lastGM-prevGM)}pp vs föregående</div>}
          </div>
          <div className="kf-kpi">
            <div className="kf-kpi-label">Rörelsemarginal</div>
            <div className={`kf-kpi-val ${lastEBIT!==null&&lastEBIT>=0?'ok':'warn'}`}>{fmtPct(lastEBIT!==null?Math.round(lastEBIT):null)}</div>
            <div className="kf-kpi-sub">{targets?.rorelsemarginal ? `Mål: ${n(targets.rorelsemarginal)}%` : 'Inget mål satt'}</div>
          </div>
        </div>
      )}

      <div className="kf-tabs">
        {[['oversikt','Översikt'],['inmatning','Lägg till månad'],['historik','Historik'],['mal','Mål & budget']].map(([t,l])=>(
          <button key={t} className={`kf-tab${tab===t?' active':''}`} onClick={()=>setTab(t)}>{l}</button>
        ))}
      </div>

      {tab==='oversikt' && (
        <div className="kf-tab-content">
          {months.length===0 ? (
            <div className="kf-empty">
              <p>Ingen data ännu.</p>
              <button className="kf-btn-secondary" onClick={()=>setTab('inmatning')}>Lägg till första månaden →</button>
            </div>
          ) : (<>
            {variances.length>0 && (
              <div className="kf-card kf-var-card">
                <div className="kf-card-title">Avvikelseanalys — utfall vs mål (senaste månad)</div>
                <div className="kf-var-grid">
                  {variances.map(({label,unit,v})=>(
                    <div key={label} className={`kf-var-item kf-var-${v.status}`}>
                      <div className="kf-var-label">{label}</div>
                      <div className="kf-var-vals">
                        <span className="kf-var-actual">{Math.round(v.val)}{unit==='%'?'%':''}</span>
                        <span className="kf-var-sep">vs</span>
                        <span className="kf-var-target">{Math.round(v.target)}{unit==='%'?'%':''}</span>
                      </div>
                      <div className="kf-var-diff">
                        {v.diff>=0?'+':''}{Math.round(v.diff)}{unit==='%'?'pp':' '+unit}
                        {v.diffPct!==null && <span className="kf-var-diffpct"> ({v.diff>=0?'+':''}{Math.round(v.diffPct)}%)</span>}
                      </div>
                    </div>
                  ))}
                </div>
                {months.length>0 && targets && (
                  <div className="kf-chart-wrap kf-chart-var"><canvas ref={chartVarRef}></canvas></div>
                )}
              </div>
            )}
            <div className="kf-two-col">
              <div className="kf-card">
                <div className="kf-card-title">Kassautveckling &amp; prognos (kSEK)</div>
                <div className="kf-chart-wrap"><canvas ref={chartKassaRef}></canvas></div>
                <div className="kf-chart-legend">
                  <span><span className="kf-leg-dot" style={{background:'#378add'}}></span>Utfall</span>
                  <span><span className="kf-leg-dot kf-leg-dashed" style={{borderColor:'#e24b4a'}}></span>Prognos</span>
                </div>
              </div>
              <div className="kf-card">
                <div className="kf-card-title">Marginaler per månad</div>
                <div className="kf-chart-wrap"><canvas ref={chartMarginRef}></canvas></div>
                <div className="kf-chart-legend">
                  <span><span className="kf-leg-dot" style={{background:'#639922'}}></span>Bruttomarginal</span>
                  <span><span className="kf-leg-dot kf-leg-dashed" style={{borderColor:'#e24b4a'}}></span>Rörelsemarginal</span>
                  {targets?.bruttomarginal && <span><span className="kf-leg-dot kf-leg-target" style={{borderColor:'#639922'}}></span>Mål</span>}
                </div>
              </div>
            </div>
            <div className="kf-card">
              <div className="kf-card-title">Kassaflöde per komponent — {lastMonth?periodLabel(lastMonth.period):''} (kSEK)</div>
              <div className="kf-chart-wrap kf-chart-sm"><canvas ref={chartWfRef}></canvas></div>
            </div>
          </>)}
        </div>
      )}

      {tab==='inmatning' && (
        <div className="kf-tab-content">
          <div className="kf-two-col">
            <div className="kf-card">
              <div className="kf-demo-bar">
                <span className="kf-demo-label">Snabbstart</span>
                <button className="kf-btn-demo" onClick={handleDemo} disabled={loadingDemo}>
                  {loadingDemo?'Fyller i...':'✦ Fyll i exempeldata'}
                </button>
                <button className="kf-btn kf-btn-danger" onClick={handleReset}>
                  Återställ all data
                </button>
              </div>
              <div className="kf-divider"><span>eller fyll i manuellt</span></div>
              <div className="kf-form-section">
                <div className="kf-section-label">Period</div>
                <div className="kf-form-row">
                  <div className="kf-field"><label>Månad</label><input type="month" value={form.period} onChange={e=>setForm(f=>({...f,period:e.target.value}))}/></div>
                  <div className="kf-field"><label>Ingående kassa (kSEK)</label><input type="number" placeholder="0" value={form.ing_kassa} onChange={e=>setForm(f=>({...f,ing_kassa:e.target.value}))}/></div>
                </div>
              </div>
              <div className="kf-form-section">
                <div className="kf-section-label"><span className="kf-dot kf-dot-green"></span>Inbetalningar</div>
                <div className="kf-form-row">
                  <div className="kf-field"><label>Inbetald omsättning (kSEK)</label><input type="number" placeholder="0" value={form.omsattning} onChange={e=>setForm(f=>({...f,omsattning:e.target.value}))}/></div>
                  <div className="kf-field"><label>Övrigt in (kSEK)</label><input type="number" placeholder="0" value={form.ovrigt_in} onChange={e=>setForm(f=>({...f,ovrigt_in:e.target.value}))}/></div>
                </div>
              </div>
              <div className="kf-form-section">
                <div className="kf-section-label"><span className="kf-dot kf-dot-red"></span>Utbetalningar rörelse</div>
                <div className="kf-form-row">
                  <div className="kf-field"><label>Produktionskostnader (kSEK)</label><input type="number" placeholder="0" value={form.produktionskost} onChange={e=>setForm(f=>({...f,produktionskost:e.target.value}))}/></div>
                  <div className="kf-field"><label>Personalkostnader (kSEK)</label><input type="number" placeholder="0" value={form.personalkost} onChange={e=>setForm(f=>({...f,personalkost:e.target.value}))}/></div>
                </div>
                <div className="kf-form-row">
                  <div className="kf-field"><label>Externa kostnader (kSEK)</label><input type="number" placeholder="0" value={form.externa_kost} onChange={e=>setForm(f=>({...f,externa_kost:e.target.value}))}/></div>
                </div>
              </div>
              <div className="kf-form-section">
                <div className="kf-section-label"><span className="kf-dot kf-dot-blue"></span>Investering &amp; finansiering</div>
                <div className="kf-form-row">
                  <div className="kf-field"><label>CAPEX, negativt tal (kSEK)</label><input type="number" placeholder="0" value={form.capex} onChange={e=>setForm(f=>({...f,capex:e.target.value}))}/></div>
                  <div className="kf-field"><label>Externt kapital, netto (kSEK)</label><input type="number" placeholder="0" value={form.externt_kapital} onChange={e=>setForm(f=>({...f,externt_kapital:e.target.value}))}/></div>
                </div>
              </div>
              <div className="kf-netto-row">
                <div>
                  <div className="kf-netto-label">Periodens kassaflöde</div>
                  {formGM!==null && <div className="kf-netto-sub">Bruttomarginal: {formGM}%</div>}
                </div>
                <div className={`kf-netto-val ${formNetto>=0?'pos':'neg'}`}>{formNetto>=0?'+':''}{fmtSEK(Math.round(formNetto))} kSEK</div>
              </div>
              <button className="kf-btn-primary" onClick={handleSave} disabled={saving}>{saving?'Sparar...':'Spara månad →'}</button>
            </div>
            <div className="kf-card kf-info-card">
              <div className="kf-card-title">Vad registreras?</div>
              <dl className="kf-info-list">
                <dt>Inbetald omsättning</dt><dd>Faktiskt kassainflöde — inte fakturerat belopp.</dd>
                <dt>Produktionskostnader</dt><dd>Direkta leveranskostnader. Används för bruttomarginal.</dd>
                <dt>Externa kostnader</dt><dd>Konsulter, lokaler, marknadsföring, övriga rörelsekostnader.</dd>
                <dt>CAPEX</dt><dd>Investeringsutbetalningar — matas in som negativt tal.</dd>
                <dt>Externt kapital</dt><dd>Nyemission och/eller nettolåneförändring. Positivt = inflöde.</dd>
              </dl>
            </div>
          </div>
        </div>
      )}

      {tab==='historik' && (
        <div className="kf-tab-content">
          <div className="kf-card">
            <div className="kf-card-title">Månadshistorik</div>
            {months.length===0
              ? <p className="kf-empty-inline">Ingen data. Lägg till en månad eller fyll i exempeldata.</p>
              : (
                <div className="kf-table-wrap">
                  <table className="kf-table">
                    <thead><tr>
                      <th>Månad</th>
                      <th className="num">Omsättning</th>
                      <th className="num">Rörelseflöde</th>
                      <th className="num">Bruttomarginal</th>
                      <th className="num">Rörelsemarginal</th>
                      <th className="num">Utgående kassa</th>
                      <th className="num">Status</th>
                      <th></th>
                    </tr></thead>
                    <tbody>
                      {months.map(d=>{
                        const k=calcKassa(d), r=calcRorelse(d), gm=calcGM(d), eb=calcEBIT(d);
                        const st=k<1500?'danger':k<2500?'warn':'ok';
                        return (
                          <tr key={d.id}>
                            <td>{periodLabel(d.period)}</td>
                            <td className="num">{fmtSEK(d.omsattning)}</td>
                            <td className={`num ${r>=0?'col-ok':'col-neg'}`}>{fmtSEK(Math.round(r))}</td>
                            <td className="num">{fmtPct(gm!==null?Math.round(gm):null)}</td>
                            <td className="num">{fmtPct(eb!==null?Math.round(eb):null)}</td>
                            <td className="num">{fmtSEK(Math.round(k))}</td>
                            <td className="num"><span className={`kf-pill kf-pill-${st}`}>{st==='danger'?'Kritisk':st==='warn'?'Observera':'OK'}</span></td>
                            <td className="num">
                              {deleteId===d.id
                                ? <span><button className="kf-link-btn kf-link-danger" onClick={()=>handleDelete(d.id)}>Bekräfta</button>{' / '}<button className="kf-link-btn" onClick={()=>setDeleteId(null)}>Avbryt</button></span>
                                : <button className="kf-link-btn kf-link-danger" onClick={()=>setDeleteId(d.id)}>Ta bort</button>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
          </div>
        </div>
      )}

      {tab==='mal' && (
        <div className="kf-tab-content">
          <div className="kf-two-col">
            <div className="kf-card">
              <div className="kf-card-title">Målnyckeltal</div>
              <div className="kf-form-section">
                <div className="kf-section-label">Beteckning</div>
                <div className="kf-form-row">
                  <div className="kf-field" style={{gridColumn:'1/-1'}}>
                    <label>Namn på budget/plan</label>
                    <input type="text" placeholder="t.ex. Budget 2026" value={tForm.label} onChange={e=>setTForm(f=>({...f,label:e.target.value}))}/>
                  </div>
                </div>
              </div>
              <div className="kf-form-section">
                <div className="kf-section-label"><span className="kf-dot kf-dot-green"></span>Resultatmål</div>
                <div className="kf-form-row">
                  <div className="kf-field"><label>Omsättningstillväxt, mål (%)</label><input type="number" placeholder="t.ex. 20" value={tForm.omsattning_tillvaxt} onChange={e=>setTForm(f=>({...f,omsattning_tillvaxt:e.target.value}))}/></div>
                  <div className="kf-field"><label>Bruttomarginal, mål (%)</label><input type="number" placeholder="t.ex. 48" value={tForm.bruttomarginal} onChange={e=>setTForm(f=>({...f,bruttomarginal:e.target.value}))}/></div>
                </div>
                <div className="kf-form-row">
                  <div className="kf-field"><label>Rörelsemarginal, mål (%) — negativt OK</label><input type="number" placeholder="t.ex. -10" value={tForm.rorelsemarginal} onChange={e=>setTForm(f=>({...f,rorelsemarginal:e.target.value}))}/></div>
                </div>
              </div>
              <div className="kf-form-section">
                <div className="kf-section-label"><span className="kf-dot kf-dot-red"></span>Kassaflödesmål</div>
                <div className="kf-form-row">
                  <div className="kf-field"><label>Max burn rate (kSEK/mån, negativt)</label><input type="number" placeholder="t.ex. -300" value={tForm.burn_rate_max} onChange={e=>setTForm(f=>({...f,burn_rate_max:e.target.value}))}/></div>
                  <div className="kf-field"><label>Min runway (månader)</label><input type="number" placeholder="t.ex. 6" value={tForm.runway_min} onChange={e=>setTForm(f=>({...f,runway_min:e.target.value}))}/></div>
                </div>
                <div className="kf-form-row">
                  <div className="kf-field"><label>CAPEX-budget per kvartal (kSEK)</label><input type="number" placeholder="t.ex. 150" value={tForm.capex_budget} onChange={e=>setTForm(f=>({...f,capex_budget:e.target.value}))}/></div>
                </div>
              </div>
              <div className="kf-form-section">
                <div className="kf-section-label"><span className="kf-dot kf-dot-blue"></span>Prognosparametrar</div>
                <div className="kf-targets-hint">Används för att bygga automatisk kassaprognos — inte styrmål i sig.</div>
                <div className="kf-form-row">
                  <div className="kf-field"><label>Genomsnittlig betalningstid (dagar)</label><input type="number" placeholder="t.ex. 30" value={tForm.betalningstid_dagar} onChange={e=>setTForm(f=>({...f,betalningstid_dagar:e.target.value}))}/></div>
                  <div className="kf-field"><label>Avskrivningstakt (% av CAPEX/år)</label><input type="number" placeholder="t.ex. 20" value={tForm.avskrivningstakt} onChange={e=>setTForm(f=>({...f,avskrivningstakt:e.target.value}))}/></div>
                </div>
                <div className="kf-form-row">
                  <div className="kf-field"><label>Aktiveringsgrad personalkost (%)</label><input type="number" placeholder="t.ex. 15" value={tForm.aktiveringsgrad} onChange={e=>setTForm(f=>({...f,aktiveringsgrad:e.target.value}))}/></div>
                </div>
              </div>
              <button className="kf-btn-primary" onClick={handleSaveTargets} disabled={savingT}>{savingT?'Sparar...':'Spara mål →'}</button>
            </div>
            <div className="kf-card kf-info-card">
              <div className="kf-card-title">Om målnyckeltal</div>
              <dl className="kf-info-list">
                <dt>Resultatmål</dt><dd>Sätts som snitt över 12 månader. Visas som referenslinjer i marginalgrafen och ingår i avvikelseanalysen på översiktsfliken.</dd>
                <dt>Kassaflödesmål</dt><dd>Burn rate och runway används direkt i flaggningslogiken. Röd varning triggas när runway understiger det minimum du sätter här.</dd>
                <dt>CAPEX-budget</dt><dd>Jämförs mot faktisk CAPEX per rullande kvartal i avvikelseanalysen.</dd>
                <dt>Prognosparametrar</dt><dd>Betalningstid påverkar när fakturerad omsättning syns som kassa. Avskrivningstakt och aktiveringsgrad används för framtida utbyggnad av prognosmodellen.</dd>
              </dl>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
