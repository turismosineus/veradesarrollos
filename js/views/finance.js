// Finanzas: Liquidaciones, Gastos registrados e Inversores (con editar/borrar).
import { S, D } from '../state.js';
import { fmt, fmtK, esc } from '../utils.js';

export function rFinanzas(){
  const tI = D.investments.reduce((a,i)=>a+i.amount,0);
  const tG = D.expenses.reduce((a,e)=>a+e.amount,0);
  const tL = (D.liquidaciones||[]).reduce((a,l)=>a+l.amount,0);
  const tab = ['liquidaciones','gastos','inversores'].includes(S.tab) ? S.tab : 'liquidaciones';
  const empty = (n, msg) => `<tr><td colspan="${n}" style="text-align:center;color:var(--text3);padding:2rem">${msg}</td></tr>`;
  let body = '';
  if(tab === 'liquidaciones'){
    body = `<div class="card"><div class="card-head"><div class="card-title">Liquidaciones — mano de obra</div><button class="btn-or sm" id="new-liq"><i class="ti ti-plus"></i> Registrar liquidación</button></div>
      <table><thead><tr><th>Proveedor / Profesional</th><th>Rubro</th><th>Proyecto</th><th>Monto</th><th>Fecha</th><th>Nota</th><th></th></tr></thead>
      <tbody>${(D.liquidaciones||[]).length ? (D.liquidaciones||[]).map(l=>`<tr><td style="font-weight:500">${esc((D.providers.find(p=>p.id==l.providerId)||{}).name||l.worker)}</td><td><span class="badge bb">${esc(l.trade||'-')}</span></td><td style="color:var(--text2)">${esc(l.project||'-')}</td><td style="font-weight:500">${fmt(l.amount)}</td><td>${l.date||''}</td><td style="color:var(--text2)">${esc(l.note||'-')}</td><td style="white-space:nowrap"><button class="link-btn" data-ledit="${l.id}" title="Editar"><i class="ti ti-edit"></i></button> <button class="tbl-del" data-ldel="${l.id}"><i class="ti ti-trash"></i></button></td></tr>`).join('') : empty(7,'Sin liquidaciones cargadas. Registrá acá los pagos de mano de obra.')}</tbody></table></div>`;
  } else if(tab === 'gastos'){
    body = `<div class="card"><div class="card-head"><div class="card-title">Gastos registrados — compras</div><button class="btn-or sm" id="new-exp"><i class="ti ti-plus"></i> Registrar gasto</button></div>
      <table><thead><tr><th>Concepto</th><th>Categoría</th><th>Proyecto</th><th>Proveedor</th><th>Monto</th><th>Fecha</th><th>Factura</th><th></th></tr></thead>
      <tbody>${D.expenses.length ? D.expenses.map(e=>`<tr><td>${esc(e.concept)}</td><td><span class="badge bgr">${esc(e.category)}</span></td><td style="color:var(--text2)">${esc(e.project)}</td><td style="color:var(--text2)">${esc(e.provider)}</td><td style="font-weight:500">${fmt(e.amount)}</td><td>${e.date||''}</td><td>${e.fileId?`<button class="link-btn" data-rview="${e.fileId}" data-rname="${esc(e.concept)}"><i class="ti ti-eye"></i></button> <button class="link-btn" data-rdl="${e.fileId}" data-rname="${esc(e.concept)}"><i class="ti ti-download"></i></button>`:'<span style="color:var(--text3)">—</span>'}</td><td style="white-space:nowrap"><button class="link-btn" data-eedit="${e.id}" title="Editar"><i class="ti ti-edit"></i></button> <button class="tbl-del" data-edel="${e.id}" data-efile="${e.fileId||''}"><i class="ti ti-trash"></i></button></td></tr>`).join('') : empty(8,'Sin gastos cargados. Registrá las compras acá y adjuntá la factura.')}</tbody></table></div>`;
  } else {
    body = `<div class="card"><div class="card-head"><div class="card-title">Inversores — aportes</div><button class="btn-or sm" id="new-inv"><i class="ti ti-plus"></i> Registrar aporte</button></div>
      <table><thead><tr><th>Inversor</th><th>Proyecto</th><th>Monto aportado</th><th>Participación</th><th>Fecha</th><th></th></tr></thead>
      <tbody>${D.investments.length ? D.investments.map(i=>`<tr><td style="font-weight:500">${esc(i.investor)}</td><td style="color:var(--text2)">${esc(i.project)}</td><td style="font-weight:500">${fmt(i.amount)}</td><td><span class="badge bb">${i.pct||0}%</span></td><td>${i.date||''}</td><td style="white-space:nowrap"><button class="link-btn" data-iedit="${i.id}" title="Editar"><i class="ti ti-edit"></i></button> <button class="tbl-del" data-idel="${i.id}"><i class="ti ti-trash"></i></button></td></tr>`).join('') : empty(6,'Sin aportes cargados.')}</tbody></table></div>`;
  }
  return `
  <div class="topbar"><h1>FINANZAS</h1></div>
  <div class="content">
    <div class="kpi-grid">
      <div class="kpi"><i class="ti ti-users"></i><div class="kpi-lbl">Capital invertido</div><div class="kpi-val">${fmtK(tI)}</div></div>
      <div class="kpi"><i class="ti ti-receipt"></i><div class="kpi-lbl">Gastos (compras)</div><div class="kpi-val">${fmtK(tG)}</div></div>
      <div class="kpi"><i class="ti ti-tool"></i><div class="kpi-lbl">Liquidaciones</div><div class="kpi-val">${fmtK(tL)}</div></div>
      <div class="kpi"><i class="ti ti-wallet"></i><div class="kpi-lbl">Balance disponible</div><div class="kpi-val">${fmtK(tI - tG - tL)}</div></div>
    </div>
    <div class="tabs">
      <button class="tab ${tab==='liquidaciones'?'active':''}" data-tab="liquidaciones"><i class="ti ti-tool"></i> Liquidaciones</button>
      <button class="tab ${tab==='gastos'?'active':''}" data-tab="gastos"><i class="ti ti-receipt"></i> Gastos registrados</button>
      <button class="tab ${tab==='inversores'?'active':''}" data-tab="inversores"><i class="ti ti-users"></i> Inversores</button>
    </div>
    ${body}
  </div>`;
}
