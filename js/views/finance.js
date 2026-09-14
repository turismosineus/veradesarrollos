// Módulo Finanzas: tablero comparativo de todas las obras.
import { D } from '../state.js';
import { fmt, fmtK, esc, sBadge } from '../utils.js';

export function rFinanzas(){
  const rows = D.projects.map(p => {
    const proyectado = D.providers.flatMap(pv => (pv.budgets||[]).filter(b => b.projectId === p.id && b.status === 'aprobado')).reduce((a,b)=>a+b.amount,0);
    const registrado = p.spent || 0;
    const base = proyectado > 0 ? proyectado : (p.budget || 0);      // contra qué se mide la ganancia
    const ganancia = (p.salePrice||0) - base;
    const margen = p.salePrice ? Math.round(ganancia / p.salePrice * 100) : 0;
    const ejec = base ? Math.round(registrado / base * 100) : null;
    const capital = D.investments.filter(i => i.projectId === p.id).reduce((a,i)=>a+i.amount,0);
    return { p, proyectado, registrado, base, ganancia, margen, ejec, capital };
  });
  const T = k => rows.reduce((a,r)=>a+(r[k]||0),0);
  const tVenta = rows.reduce((a,r)=>a+(r.p.salePrice||0),0), tPres = rows.reduce((a,r)=>a+(r.p.budget||0),0);
  return `
  <div class="topbar"><div><h1>FINANZAS</h1><div class="topbar-sub">Resumen por obra · ${rows.length} proyecto${rows.length!==1?'s':''}</div></div></div>
  <div class="content">
    <div class="kpi-grid">
      <div class="kpi"><i class="ti ti-file-dollar"></i><div class="kpi-lbl">Gasto proyectado</div><div class="kpi-val">${fmtK(T('proyectado'))}</div></div>
      <div class="kpi"><i class="ti ti-receipt"></i><div class="kpi-lbl">Gasto registrado</div><div class="kpi-val">${fmtK(T('registrado'))}</div></div>
      <div class="kpi"><i class="ti ti-home-dollar"></i><div class="kpi-lbl">Venta estimada</div><div class="kpi-val">${fmtK(tVenta)}</div></div>
      <div class="kpi"><i class="ti ti-trending-up"></i><div class="kpi-lbl">Ganancia estimada</div><div class="kpi-val" style="color:${T('ganancia')>=0?'var(--green)':'var(--red)'}">${fmtK(T('ganancia'))}</div></div>
    </div>
    <div class="card">
      <div class="card-head"><div class="card-title">Detalle por obra</div><span style="font-size:12px;color:var(--text3)">Click en una obra para ver su detalle</span></div>
      <table><thead><tr><th>Obra</th><th>Estado</th><th>Presupuesto</th><th>Gasto proyectado</th><th>Gasto registrado</th><th>Ejecutado</th><th>Venta est.</th><th>Ganancia est.</th></tr></thead>
      <tbody>${rows.length ? rows.map(r=>`<tr class="clickable" data-openfin="${r.p.id}">
        <td style="font-weight:500">${esc(r.p.name)}<div style="font-size:11px;color:var(--text3)">Capital: ${fmt(r.capital)}</div></td>
        <td>${sBadge(r.p.status)}</td>
        <td>${fmt(r.p.budget)}</td>
        <td style="color:var(--purple);font-weight:500">${r.proyectado?fmt(r.proyectado):'<span style="color:var(--text3)">sin elegir</span>'}</td>
        <td style="color:var(--orange);font-weight:500">${fmt(r.registrado)}</td>
        <td>${r.ejec!=null?`<span class="badge ${r.ejec>100?'br':(r.ejec>=80?'ba':'bg')}">${r.ejec}%</span>`:'—'}</td>
        <td>${fmt(r.p.salePrice)}</td>
        <td style="font-weight:600;color:${r.ganancia>=0?'var(--green)':'var(--red)'}">${fmt(r.ganancia)} <span style="font-size:11px;color:var(--text3);font-weight:400">(${r.margen}%)</span></td>
      </tr>`).join('') : `<tr><td colspan="8" style="text-align:center;color:var(--text3);padding:2rem">Sin proyectos todavía.</td></tr>`}</tbody>
      ${rows.length?`<tfoot><tr><td style="padding:10px 1.25rem;font-weight:600;color:var(--text2)">TOTAL</td><td></td><td style="font-weight:600">${fmt(tPres)}</td><td style="font-weight:600;color:var(--purple)">${fmt(T('proyectado'))}</td><td style="font-weight:600;color:var(--orange)">${fmt(T('registrado'))}</td><td></td><td style="font-weight:600">${fmt(tVenta)}</td><td style="font-weight:700;color:${T('ganancia')>=0?'var(--green)':'var(--red)'}">${fmt(T('ganancia'))}</td></tr></tfoot>`:''}
      </table>
    </div>
    <div style="font-size:11px;color:var(--text3);padding:0 4px;line-height:1.6">
      <b>Ganancia est.</b> = venta estimada − gasto proyectado (si ya elegiste presupuestos) o − presupuesto (si todavía no). &nbsp;·&nbsp;
      <b>Ejecutado</b> = gasto registrado ÷ esa misma base. Verde &lt; 80 %, amarillo 80–100 %, rojo pasado.
    </div>
  </div>`;
}
