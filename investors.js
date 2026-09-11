// Módulo de Inversores: listado y detalle, con proyección de retorno.
import { S, D } from '../state.js';
import { fmt, fmtK, esc, aggInvestors } from '../utils.js';

// Retorno estimado de un aporte = participación % × ganancia proyectada del proyecto (venta est. − presupuesto).
function retOf(i){
  const p = D.projects.find(x => x.name === i.project);
  if(!p) return { gain:0, total:i.amount, known:false };
  const g = (p.salePrice||0) - (p.budget||0);
  const gain = g * (i.pct||0) / 100;
  return { gain, total:i.amount + gain, known:true };
}

export function rInversores(){
  const list = aggInvestors();
  const total = D.investments.reduce((a,i)=>a+i.amount,0);
  const totRet = D.investments.reduce((a,i)=>a+retOf(i).total,0);
  const projCount = new Set(D.investments.map(i=>i.project)).size;
  const retByName = n => D.investments.filter(i=>i.investor===n).reduce((a,i)=>a+retOf(i).total,0);
  return `
  <div class="topbar"><div><h1>INVERSORES</h1><div class="topbar-sub">${list.length} inversor${list.length!==1?'es':''} · ${D.investments.length} aporte${D.investments.length!==1?'s':''}</div></div>
    <div class="topbar-actions"><button class="btn-or" id="new-investor"><i class="ti ti-plus"></i> Registrar aporte</button></div></div>
  <div class="content">
    <div class="kpi-grid">
      <div class="kpi"><i class="ti ti-users"></i><div class="kpi-lbl">Inversores</div><div class="kpi-val">${list.length}</div></div>
      <div class="kpi"><i class="ti ti-cash"></i><div class="kpi-lbl">Capital total</div><div class="kpi-val">${fmtK(total)}</div></div>
      <div class="kpi"><i class="ti ti-trending-up"></i><div class="kpi-lbl">Retorno estimado total</div><div class="kpi-val gr">${fmtK(totRet)}</div></div>
      <div class="kpi"><i class="ti ti-building"></i><div class="kpi-lbl">Proyectos con inversión</div><div class="kpi-val">${projCount}</div></div></div>
    <div class="card"><div class="card-head"><div class="card-title">Inversores registrados</div><span style="font-size:12px;color:var(--text3)">Retorno = aporte + % de la ganancia estimada del proyecto</span></div>
      <table><thead><tr><th>Inversor</th><th>Proyectos</th><th>Aportes</th><th>Total aportado</th><th>Retorno est.</th></tr></thead>
      <tbody>${list.length?list.map(x=>`<tr class="clickable" data-oinv="${encodeURIComponent(x.name)}"><td style="font-weight:500">${esc(x.name)}</td><td style="color:var(--text2)">${[...x.projects].map(esc).join(', ')}</td><td>${x.count}</td><td style="color:var(--orange);font-weight:500">${fmt(x.total)}</td><td style="color:var(--green);font-weight:600">${fmt(retByName(x.name))}</td></tr>`).join(''):`<tr><td colspan="5" style="text-align:center;color:var(--text3);padding:2rem">Sin inversores aún. Registrá el primer aporte.</td></tr>`}</tbody></table>
    </div>
  </div>`;
}

export function rInvD(){
  const name = S.inv;
  const items = D.investments.filter(i => i.investor === name);
  if(!items.length){ S.page = 'inversores'; return rInversores(); }
  const total = items.reduce((a,i)=>a+i.amount,0);
  const gain = items.reduce((a,i)=>a+retOf(i).gain,0);
  const docs = (D.investorDocs||[]).filter(d => d.investor === name);
  const projects = [...new Set(items.map(i=>i.project))];
  return `
  <div class="topbar">
    <button class="back-btn" id="back-inv"><i class="ti ti-arrow-left"></i> Inversores</button>
    <div><h1>${esc(name.toUpperCase())}</h1><div class="topbar-sub">${items.length} aporte${items.length!==1?'s':''} · ${fmt(total)} aportado</div></div>
    <div class="topbar-actions"><button class="btn-or" data-addapt="${encodeURIComponent(name)}"><i class="ti ti-plus"></i> Nuevo aporte</button></div>
  </div>
  <div class="content">
    <div class="kpi-grid">
      <div class="kpi"><i class="ti ti-cash"></i><div class="kpi-lbl">Total aportado</div><div class="kpi-val">${fmtK(total)}</div></div>
      <div class="kpi"><i class="ti ti-chart-arrows-vertical"></i><div class="kpi-lbl">Ganancia estimada</div><div class="kpi-val gr">${fmtK(gain)}</div></div>
      <div class="kpi"><i class="ti ti-coin"></i><div class="kpi-lbl">Total a recibir est.</div><div class="kpi-val gr">${fmtK(total + gain)}</div></div>
      <div class="kpi"><i class="ti ti-building"></i><div class="kpi-lbl">Proyectos</div><div class="kpi-val">${projects.length}</div></div></div>
    <div class="card"><div class="card-head"><div class="card-title">Aportes y proyección</div><span style="font-size:12px;color:var(--text3)">Estimado según precio de venta y presupuesto de cada proyecto</span></div>
      <table><thead><tr><th>Proyecto</th><th>Aporte</th><th>Particip.</th><th>Ganancia est.</th><th>Total a recibir</th><th>Fecha</th><th></th></tr></thead>
      <tbody>${items.map(i=>{ const r = retOf(i); return `<tr><td>${esc(i.project)}${!r.known?' <span class="badge ba" title="El proyecto no existe o fue renombrado">sin proyecto</span>':''}</td><td style="font-weight:500;color:var(--orange)">${fmt(i.amount)}</td><td><span class="badge bb">${i.pct||0}%</span></td><td style="color:var(--green)">${fmt(r.gain)}</td><td style="font-weight:600;color:var(--green)">${fmt(r.total)}</td><td>${i.date||''}</td><td style="white-space:nowrap"><button class="link-btn" data-iedit="${i.id}" title="Editar"><i class="ti ti-edit"></i></button> <button class="tbl-del" data-idel="${i.id}"><i class="ti ti-trash"></i></button></td></tr>`; }).join('')}</tbody></table></div>
    <div class="sec"><h3><span>Documentos del inversor</span><button class="btn-or sm" id="new-inv-doc"><i class="ti ti-upload"></i> Subir documento</button></h3>
      ${docs.length===0?`<div style="text-align:center;padding:2rem;color:var(--text3)"><i class="ti ti-file-off" style="font-size:30px;display:block;margin-bottom:10px"></i>Sin documentos. Subí contratos, recibos o comprobantes de aporte.</div>`
      :docs.map(d=>`<div class="file-row"><i class="ti ti-${d.mime&&d.mime.includes('pdf')?'file-type-pdf':(d.mime&&d.mime.includes('image')?'photo':'file-text')}" style="font-size:22px;color:var(--text2)"></i>
        <div class="file-name"><div style="font-weight:500">${esc(d.name)}</div><div style="font-size:11px;color:var(--text3)">${esc(d.kind||'documento')}${d.note?' · '+esc(d.note):''}</div></div>
        <span class="file-date">${d.date}</span>
        <button class="link-btn" data-rview="${d.fileId}" data-rname="${esc(d.name)}"><i class="ti ti-eye"></i></button>
        <button class="link-btn" data-rdl="${d.fileId}" data-rname="${esc(d.name)}"><i class="ti ti-download"></i></button>
        <button class="tbl-del" data-ddel="${d.id}" data-rfile="${d.fileId}"><i class="ti ti-trash"></i></button></div>`).join('')}</div>
  </div>`;
}
