// Proveedores: listado + comparativa de presupuestos, detalle (órdenes, comprobantes, presupuestos) y orden.
import { S, D } from '../state.js';
import { OSTATUS, OL, OB, PROV_KINDS } from '../constants.js';
import { esc, fmt, fmtK, oTotal } from '../utils.js';

const budgetBadge = s => s==='aprobado' ? '<span class="badge bg">aprobado</span>' : (s==='rechazado' ? '<span class="badge br">rechazado</span>' : '<span class="badge ba">pendiente</span>');

export function rProveedores(){
  const all = D.providers.flatMap(p => (p.budgets||[]).map(b => ({ ...b, provider:p.name })));
  const concepts = [...new Set(all.map(b => b.concept || 'Sin concepto'))];
  const comp = all.length ? `
    <div class="card"><div class="card-head"><div class="card-title">Comparativa de presupuestos</div><span style="font-size:12px;color:var(--text3)">Agrupados por concepto · el más bajo resaltado</span></div>
      <table><thead><tr><th>Concepto</th><th>Proveedor</th><th>Proyecto</th><th>Monto</th><th>Estado</th></tr></thead><tbody>
      ${concepts.map(c => { const rows = all.filter(b => (b.concept||'Sin concepto')===c).sort((a,b)=>a.amount-b.amount); const min = rows[0] ? rows[0].amount : 0;
        return rows.map((b,i)=>`<tr><td style="font-weight:500">${i===0?esc(c):''}</td><td>${esc(b.provider)}</td><td style="color:var(--text2)">${esc(b.project||'-')}</td><td style="font-weight:600;color:${b.amount===min?'var(--green)':'var(--text)'}">${fmt(b.amount)}${b.amount===min&&rows.length>1?' <span class="badge bg">más bajo</span>':''}</td><td>${budgetBadge(b.status)}</td></tr>`).join(''); }).join('')}
      </tbody></table></div>` : '';
  const filt = S.provFilter || 'todos';
  const list = filt==='todos' ? D.providers : D.providers.filter(p => (p.kind||'materiales')===filt);
  const liqOf = p => (D.liquidaciones||[]).filter(l => l.providerId==p.id || (!l.providerId && l.worker===p.name)).reduce((a,l)=>a+l.amount,0);
  return `
  <div class="topbar"><div><h1>PROVEEDORES</h1><div class="topbar-sub">${D.providers.length} registrados</div></div>
    <div class="topbar-actions"><button class="btn-or" id="new-prov"><i class="ti ti-plus"></i> Nuevo proveedor</button></div></div>
  <div class="content">
    <div class="tabs"><button class="tab ${filt==='todos'?'active':''}" data-pfilter="todos">Todos (${D.providers.length})</button>${PROV_KINDS.map(k=>`<button class="tab ${filt===k?'active':''}" data-pfilter="${k}">${k} (${D.providers.filter(p=>(p.kind||'materiales')===k).length})</button>`).join('')}</div>
    <div class="card"><div class="card-head"><div class="card-title">Listado de proveedores</div></div>
    <table><thead><tr><th>Nombre</th><th>Tipo</th><th>Rubro</th><th>Contacto</th><th>Compras</th><th>Liquidado</th><th>Presup.</th></tr></thead>
    <tbody>${list.length ? list.map(p=>`<tr class="clickable" data-oprov="${p.id}">
      <td style="font-weight:500">${esc(p.name)}</td><td><span class="badge bgr">${esc(p.kind||'materiales')}</span></td><td><span class="badge bb">${esc(p.rubro)}</span></td><td>${esc(p.contact)}</td>
      <td style="color:var(--orange);font-weight:500">${fmt(p.orders.reduce((a,o)=>a+oTotal(o),0))}</td><td style="color:var(--green);font-weight:500">${fmt(liqOf(p))}</td><td>${(p.budgets||[]).length}</td></tr>`).join('') : `<tr><td colspan="7" style="text-align:center;color:var(--text3);padding:2rem">Sin proveedores en esta categoría.</td></tr>`}</tbody></table>
  </div>${comp}</div>`;
}

export function rProvD(){
  const p = D.providers.find(x => x.id === S.prov); if(!p) return '';
  const tab = S.tab, totOC = p.orders.reduce((a,o)=>a+oTotal(o),0), recs = p.receipts||[], buds = p.budgets||[]; let body = '';
  if(tab==='info') body = `
    <div class="two-col">
      <div class="sec"><h3>Datos del proveedor</h3>
        <div class="stat-row"><span class="sl"><i class="ti ti-phone" style="margin-right:5px"></i>Teléfono</span><span class="sv">${esc(p.phone||'-')}</span></div>
        <div class="stat-row"><span class="sl"><i class="ti ti-mail" style="margin-right:5px"></i>Email</span><span class="sv" style="color:var(--orange)">${esc(p.email||'-')}</span></div>
        <div class="stat-row"><span class="sl"><i class="ti ti-tag" style="margin-right:5px"></i>Rubro</span><span class="sv">${esc(p.rubro)}</span></div>
        <div class="stat-row"><span class="sl"><i class="ti ti-category" style="margin-right:5px"></i>Tipo</span><span class="sv">${esc(p.kind||'materiales')}</span></div></div>
      <div class="sec"><h3>Resumen de actividad</h3>
        <div class="stat-row"><span class="sl">Total en órdenes</span><span class="sv or">${fmt(totOC)}</span></div>
        <div class="stat-row"><span class="sl">Total liquidado (mano de obra)</span><span class="sv gr">${fmt((D.liquidaciones||[]).filter(l=>l.providerId==p.id||(!l.providerId&&l.worker===p.name)).reduce((a,l)=>a+l.amount,0))}</span></div>
        <div class="stat-row"><span class="sl">Órdenes registradas</span><span class="sv">${p.orders.length}</span></div>
        <div class="stat-row"><span class="sl">Comprobantes cargados</span><span class="sv">${recs.length}</span></div>
        <div class="stat-row"><span class="sl">Presup. aprobados</span><span class="sv gr">${buds.filter(b=>b.status==='aprobado').length} de ${buds.length}</span></div></div>
    </div>`;
  else if(tab==='ordenes'){
    const bc = OSTATUS.reduce((a,s)=>{ a[s]=p.orders.filter(o=>o.status===s).length; return a; },{});
    body = `<div class="kpi-grid" style="margin-bottom:1rem">${OSTATUS.map(s=>`<div class="kpi" style="padding:.75rem"><div class="kpi-lbl">${OL[s]}</div><div class="kpi-val" style="font-size:20px">${bc[s]}</div></div>`).join('')}</div>
    <div class="sec"><h3><span>Órdenes de compra</span><button class="btn-or sm" id="new-order"><i class="ti ti-plus"></i> Nueva orden</button></h3>
      ${p.orders.length===0?`<div style="text-align:center;padding:2.5rem;color:var(--text3)"><i class="ti ti-file-off" style="font-size:32px;display:block;margin-bottom:10px"></i>Sin órdenes registradas aún</div>`:''}
      ${p.orders.map(o=>`<div class="order-row" data-oo="${o.id}"><div><div class="order-num">${o.id}</div><div class="order-proj">${esc(o.project)}</div></div>
        <div style="flex:1;padding:0 12px"><span class="badge ${OB[o.status]}">${OL[o.status]}</span><div style="font-size:11px;color:var(--text3);margin-top:3px">${o.items.length} ítem${o.items.length!==1?'s':''}</div></div>
        <div class="order-total">${fmt(oTotal(o))}</div><div class="order-date">${o.date}</div><i class="ti ti-chevron-right" style="color:var(--text3);font-size:16px"></i></div>`).join('')}</div>`;
  }
  else if(tab==='comprobantes'){
    const totalComp = recs.reduce((a,r)=>a+(r.amount||0),0);
    body = `<div class="kpi-grid" style="margin-bottom:1rem">
      <div class="kpi" style="padding:.75rem"><div class="kpi-lbl">Comprobantes</div><div class="kpi-val" style="font-size:20px">${recs.length}</div></div>
      <div class="kpi" style="padding:.75rem"><div class="kpi-lbl">Total en comprobantes</div><div class="kpi-val" style="font-size:20px">${fmtK(totalComp)}</div></div>
      <div class="kpi" style="padding:.75rem"><div class="kpi-lbl">Órdenes asociadas</div><div class="kpi-val" style="font-size:20px">${p.orders.length}</div></div></div>
    <div class="sec"><h3><span>Facturas y comprobantes de pago</span><button class="btn-or sm" id="new-receipt"><i class="ti ti-upload"></i> Cargar comprobante</button></h3>
      ${recs.length===0?`<div style="text-align:center;padding:2.5rem;color:var(--text3)"><i class="ti ti-receipt-off" style="font-size:32px;display:block;margin-bottom:10px"></i>Sin comprobantes cargados.</div>`
      :recs.map(r=>`<div class="file-row">
        <i class="ti ti-${r.mime&&r.mime.includes('pdf')?'file-type-pdf':(r.mime&&r.mime.includes('image')?'photo':'file-invoice')}" style="font-size:22px;color:var(--text2)"></i>
        <div class="file-name"><div style="font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(r.name)}</div><div style="font-size:11px;color:var(--text3)">${esc(r.project||'Sin proyecto')}${r.orderId?' · '+esc(r.orderId):''}${r.note?' · '+esc(r.note):''}</div></div>
        ${r.amount?`<span style="color:var(--orange);font-weight:600;min-width:90px;text-align:right">${fmt(r.amount)}</span>`:`<span style="min-width:90px"></span>`}
        <span class="file-date">${r.date}</span>
        <button class="link-btn" data-rview="${r.fileId}" data-rname="${esc(r.name)}"><i class="ti ti-eye"></i></button>
        <button class="link-btn" data-rdl="${r.fileId}" data-rname="${esc(r.name)}"><i class="ti ti-download"></i></button>
        <button class="tbl-del" data-rdel="${r.id}" data-rfile="${r.fileId}"><i class="ti ti-trash"></i></button></div>`).join('')}</div>`;
  }
  else if(tab==='presupuestos'){
    body = `<div class="sec"><h3><span>Presupuestos</span><button class="btn-or sm" id="new-budget"><i class="ti ti-upload"></i> Cargar presupuesto</button></h3>
      ${buds.length===0?`<div style="text-align:center;padding:2.5rem;color:var(--text3)"><i class="ti ti-file-invoice" style="font-size:32px;display:block;margin-bottom:10px"></i>Sin presupuestos cargados. Subí el PDF con el concepto y el monto para poder compararlo con otros proveedores.</div>`
      :`<table><thead><tr><th>Concepto</th><th>Proyecto</th><th>Monto</th><th>Estado</th><th>Fecha</th><th>Archivo</th><th></th></tr></thead><tbody>
        ${buds.map(b=>`<tr><td style="font-weight:500">${esc(b.concept||b.name||'-')}${b.note?`<div style="font-size:11px;color:var(--text3)">${esc(b.note)}</div>`:''}</td><td style="color:var(--text2)">${esc(b.project||'-')}</td><td style="font-weight:600;color:var(--orange)">${fmt(b.amount)}</td><td>${budgetBadge(b.status)}</td><td>${b.date||''}</td>
          <td>${b.fileId?`<button class="link-btn" data-rview="${b.fileId}" data-rname="${esc(b.name||'presupuesto')}"><i class="ti ti-eye"></i></button> <button class="link-btn" data-rdl="${b.fileId}" data-rname="${esc(b.name||'presupuesto')}"><i class="ti ti-download"></i></button>`:'<span style="color:var(--text3)">—</span>'}</td>
          <td style="white-space:nowrap"><button class="link-btn" data-bdedit="${b.id}" title="Editar"><i class="ti ti-edit"></i></button> ${b.status!=='aprobado'?`<button class="link-btn" data-bdapprove="${b.id}" title="Aprobar"><i class="ti ti-check"></i></button> `:''}${b.status!=='rechazado'?`<button class="link-btn" data-bdreject="${b.id}" title="Rechazar" style="color:var(--red)"><i class="ti ti-x"></i></button> `:''}<button class="tbl-del" data-bddel="${b.id}" data-rfile="${b.fileId||''}"><i class="ti ti-trash"></i></button></td></tr>`).join('')}
        </tbody></table>`}</div>`;
  }
  return `
  <div class="topbar">
    <button class="back-btn" id="back"><i class="ti ti-arrow-left"></i> Proveedores</button>
    <div><h1>${esc(p.name.toUpperCase())}</h1><div class="topbar-sub">${esc(p.rubro)} &nbsp;·&nbsp; ${esc(p.contact)}</div></div>
    <div class="topbar-actions"><span class="badge bgr">${esc(p.kind||'materiales')}</span><span class="badge bb">${esc(p.rubro)}</span><button class="btn-sec" id="edit-prov"><i class="ti ti-edit"></i> Editar</button><button class="btn-del" data-delprov="${p.id}"><i class="ti ti-trash"></i></button></div>
  </div>
  <div class="content"><div class="tabs">
    <button class="tab ${tab==='info'?'active':''}" data-tab="info"><i class="ti ti-info-circle"></i> Información</button>
    <button class="tab ${tab==='ordenes'?'active':''}" data-tab="ordenes"><i class="ti ti-shopping-cart"></i> Órdenes de compra</button>
    <button class="tab ${tab==='comprobantes'?'active':''}" data-tab="comprobantes"><i class="ti ti-receipt"></i> Comprobantes</button>
    <button class="tab ${tab==='presupuestos'?'active':''}" data-tab="presupuestos"><i class="ti ti-file-invoice"></i> Presupuestos</button>
  </div>${body}</div>`;
}

export function rOrderD(){
  const prov = D.providers.find(x => x.id === S.prov);
  const o = prov && prov.orders.find(x => x.id === S.order); if(!o) return '';
  const si = OSTATUS.indexOf(o.status), tot = oTotal(o), next = OSTATUS[si+1];
  const stepper = `<div class="stepper">${OSTATUS.map((s,i)=>{ const done=i<si,curr=i===si; return `${i>0?`<div class="step-line ${i<=si?'done':''}"></div>`:''}<div class="step"><div class="step-dot ${done?'done':curr?'curr':''}">${done?'<i class="ti ti-check" style="font-size:13px"></i>':i+1}</div><div class="step-lbl ${curr||done?'on':''}">${OL[s]}</div></div>`; }).join('')}</div>`;
  return `
  <div class="topbar">
    <button class="back-btn" id="back-order"><i class="ti ti-arrow-left"></i> ${esc(prov.name)}</button>
    <div><h1>${o.id}</h1><div class="topbar-sub">${esc(o.project)} &nbsp;·&nbsp; ${o.date}</div></div>
    <div class="topbar-actions"><span class="badge ${OB[o.status]}">${OL[o.status]}</span>${next?`<button class="btn-or sm" data-adv="${o.id}"><i class="ti ti-arrow-right"></i> Pasar a ${OL[next]}</button>`:'<span class="badge bg">Proceso completo</span>'}</div>
  </div>
  <div class="content">
    <div class="sec"><h3>Estado de la orden</h3>${stepper}</div>
    <div class="sec"><h3><span>Ítems de la orden</span><span style="font-size:12px;color:var(--text3);font-weight:400">${o.items.length} ítem${o.items.length!==1?'s':''} &nbsp;·&nbsp; Total: <strong style="color:var(--orange)">${fmt(tot)}</strong></span></h3>
      <table class="items-table"><thead><tr><th>Descripción</th><th>Cantidad</th><th>Unidad</th><th style="text-align:right">Precio unitario</th><th style="text-align:right">Subtotal</th></tr></thead>
      <tbody>${o.items.map(it=>`<tr><td style="font-weight:500">${esc(it.desc)}</td><td>${it.qty.toLocaleString('es-AR')}</td><td><span class="badge bgr">${it.unit}</span></td><td style="text-align:right">${fmt(it.unitPrice)}</td><td style="text-align:right;font-weight:600;color:var(--orange)">${fmt(it.total)}</td></tr>`).join('')}</tbody>
      <tfoot><tr><td colspan="4" style="text-align:right;color:var(--text2)">TOTAL ORDEN</td><td style="text-align:right;font-size:16px;color:var(--orange)">${fmt(tot)}</td></tr></tfoot></table></div>
  </div>`;
}
