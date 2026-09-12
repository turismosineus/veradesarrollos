// Vistas de Proyectos: listado (rProyectos) y detalle con pestañas (rProjD).
import { S, D } from '../state.js';
import { isDirector, fmt, fmtK, esc, sBadge, toEmbed, camType } from '../utils.js';
import { PLAN_CATS } from '../constants.js';

// Badge de estado de un plano
const planStatusBadge = s => s === 'aprobado'
  ? '<span class="badge bg">aprobado</span>'
  : (s === 'obsoleto' ? '<span class="badge bgr">obsoleto</span>' : '<span class="badge ba">en revisión</span>');
const planIcon = f => f && f.mime && f.mime.includes('pdf') ? 'file-type-pdf' : (f && f.mime && f.mime.includes('image') ? 'photo' : 'file');
const revNum = f => { const m = /R?(\d+)/i.exec(f.revision || ''); return m ? +m[1] : 0; };

// Pestaña "Planos": agrupa por categoría y, dentro, por documento (con su historial de revisiones).
function rPlanos(p, dir){
  const plans = p.plans || [];
  const cats = PLAN_CATS.filter(c => plans.some(x => x.category === c))
    .concat([...new Set(plans.map(x => x.category))].filter(c => c && !PLAN_CATS.includes(c)));

  const docBlock = (cat, nm) => {
    const revs = plans.filter(x => x.category === cat && x.name === nm).sort((a, b) => revNum(b) - revNum(a));
    const cur = revs.find(r => r.current) || revs[0];
    const olds = revs.filter(r => r !== cur);
    return `
      <div style="border:1px solid var(--border);border-radius:var(--radius);padding:10px 12px;margin-bottom:8px">
        <div style="display:flex;align-items:center;gap:10px">
          <i class="ti ti-${planIcon(cur)}" style="font-size:22px;color:var(--text2)"></i>
          <div style="flex:1;min-width:0">
            <div style="font-weight:500">${esc(nm)} <span class="badge bb" style="margin-left:2px">${esc(cur.revision || 'R0')}</span> ${planStatusBadge(cur.status)}</div>
            <div style="font-size:11px;color:var(--text3)">${cur.uploadedBy ? 'Subido por ' + esc(cur.uploadedBy) : ''}${cur.date ? ' · ' + cur.date : ''}</div>
          </div>
          <button class="link-btn" data-rview="${cur.fileId}" data-rname="${esc(nm)}" title="Ver"><i class="ti ti-eye"></i></button>
          <button class="link-btn" data-rdl="${cur.fileId}" data-rname="${esc(nm)}" title="Descargar"><i class="ti ti-download"></i></button>
          ${dir ? `${cur.status !== 'aprobado' ? `<button class="link-btn" data-plapprove="${cur.id}" title="Aprobar"><i class="ti ti-check"></i></button>` : ''}
                   <button class="link-btn" data-revopen="1" data-revcat="${encodeURIComponent(cat)}" data-revname="${encodeURIComponent(nm)}" title="Nueva revisión"><i class="ti ti-versions"></i></button>
                   <button class="tbl-del" data-pldel="${cur.id}" data-rfile="${cur.fileId}" title="Eliminar"><i class="ti ti-trash"></i></button>` : ''}
        </div>
        ${olds.length ? `<div style="font-size:11px;color:var(--text3);padding:6px 0 0 32px">Revisiones anteriores: ${olds.map(o => `<button class="link-btn" style="font-size:11px" data-rview="${o.fileId}" data-rname="${esc(nm)}">${esc(o.revision)}</button>`).join(' · ')}</div>` : ''}
      </div>`;
  };

  return `
    <div class="sec">
      <h3><span>Planos y documentación</span>${dir ? `<button class="btn-or sm" id="new-plan"><i class="ti ti-upload"></i> Subir planos</button>` : ''}</h3>
      ${plans.length === 0
        ? `<div style="text-align:center;padding:2.5rem;color:var(--text3)"><i class="ti ti-folder-off" style="font-size:32px;display:block;margin-bottom:10px"></i>Sin planos cargados. Subí los archivos por categoría (general, estructural, eléctrico, pluvial...). Podés subir varios a la vez.</div>`
        : cats.map(cat => {
            const names = [...new Set(plans.filter(x => x.category === cat).map(x => x.name))];
            return `<div style="margin-bottom:1.25rem">
              <div style="font-size:12px;font-weight:700;color:var(--orange);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">${esc(cat)}</div>
              ${names.map(nm => docBlock(cat, nm)).join('')}
            </div>`;
          }).join('')}
    </div>`;
}

// Pestaña "3D y multimedia": links embebidos (Sketchfab/Matterport/YouTube...), imágenes y videos.
function r3D(p, dir){
  const media = p.media || [];
  const links = media.filter(m=>m.kind==='link'), imgs = media.filter(m=>m.kind==='image'), vids = media.filter(m=>m.kind==='video');
  const del = m => dir ? `<button class="tbl-del" data-mdel="${m.id}" data-rfile="${m.fileId||''}" title="Eliminar"><i class="ti ti-trash"></i></button>` : '';
  const linkCard = m => { const emb = toEmbed(m.url); return `<div class="media-card">
      ${emb ? `<div class="embed"><iframe src="${esc(emb)}" allow="autoplay; fullscreen; xr-spatial-tracking" allowfullscreen loading="lazy"></iframe></div>` : ''}
      <div class="media-meta"><div style="flex:1;min-width:0"><div style="font-weight:500">${esc(m.title)}</div><div style="font-size:11px;color:var(--text3)">${esc(m.note||'')}${m.uploadedBy?' · '+esc(m.uploadedBy):''}${m.date?' · '+m.date:''}</div></div>
        <a class="btn-sec" href="${esc(m.url)}" target="_blank" rel="noopener"><i class="ti ti-external-link"></i> Abrir</a>${del(m)}</div></div>`; };
  const btns = dir ? `<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn-or sm" id="new-media-link"><i class="ti ti-link"></i> Agregar link 3D / video</button><button class="btn-sec" id="new-media-img" style="padding:5px 11px;font-size:12px"><i class="ti ti-photo-plus"></i> Subir imágenes</button><button class="btn-sec" id="new-media-vid" style="padding:5px 11px;font-size:12px"><i class="ti ti-video-plus"></i> Subir video</button></div>` : '';
  return `
    <div class="sec"><h3><span>Modelos 3D, recorridos y videos (links)</span>${btns}</h3>
      ${links.length ? links.map(linkCard).join('') : `<div style="color:var(--text3);font-size:13px;padding:.5rem 0">Sin links. Pegá un link de <b>Sketchfab</b> (modelo 3D), <b>Matterport / Kuula</b> (recorrido 360°) o <b>YouTube / Vimeo</b> (video) y se ve embebido acá.</div>`}
    </div>
    <div class="sec"><h3>Renders e imágenes</h3>
      ${imgs.length ? `<div class="gallery">${imgs.map(m=>`<div class="gal-item"><img class="gal-img" data-photo="${esc(m.fileId)}" data-rview="${esc(m.fileId)}" data-rname="${esc(m.title)}" alt=""><div class="gal-cap"><span style="overflow:hidden;text-overflow:ellipsis">${esc(m.title)}</span>${del(m)}</div></div>`).join('')}</div>` : `<div style="color:var(--text3);font-size:13px;padding:.5rem 0">Sin imágenes. Subí renders, fotos del modelo o capturas.</div>`}
    </div>
    <div class="sec"><h3>Videos subidos</h3>
      ${vids.length ? vids.map(m=>`<div class="media-card"><video class="gal-video" data-vfile="${esc(m.fileId)}" controls preload="metadata"></video><div class="media-meta"><div style="flex:1"><div style="font-weight:500">${esc(m.title)}</div><div style="font-size:11px;color:var(--text3)">${esc(m.note||'')}</div></div>${del(m)}</div></div>`).join('') : `<div style="color:var(--text3);font-size:13px;padding:.5rem 0">Sin videos subidos. Para videos largos conviene subirlos a YouTube y pegar el link arriba.</div>`}
    </div>`;
}

// Pestaña "Cámara": varias cámaras por obra, reproducidas según su tipo.
function rCamaras(p, dir){
  const cams = p.cameras || [];
  const player = c => { const t = camType(c.url, c.type);
    if(t==='youtube' || t==='iframe'){ const src = t==='youtube' ? (toEmbed(c.url)||c.url) : c.url; return `<div class="embed"><iframe src="${esc(src)}" allow="autoplay; fullscreen" allowfullscreen></iframe></div>`; }
    if(t==='hls') return `<video class="cam-video" data-hls="${esc(c.url)}" controls autoplay muted playsinline></video>`;
    if(t==='video') return `<video class="cam-video" src="${esc(c.url)}" controls autoplay muted playsinline></video>`;
    return `<img class="cam-img" data-snap="${esc(c.url)}" src="${esc(c.url)}" alt="">`; };
  const warn = c => /^http:\/\//i.test(c.url) ? `<span class="badge ba" title="El sitio es https: los navegadores bloquean streams http">⚠ http</span>` : '';
  return `
    <div class="sec"><h3><span>Cámaras en obra</span>${dir?`<button class="btn-or sm" id="new-camera"><i class="ti ti-video-plus"></i> Agregar cámara</button>`:''}</h3>
      ${cams.length ? cams.map(c=>`<div class="media-card"><div class="media-meta" style="padding:0 0 8px;margin-bottom:8px;border-bottom:1px solid var(--border)"><div style="flex:1;min-width:0"><div style="font-weight:500"><i class="ti ti-video" style="color:var(--orange);margin-right:4px"></i>${esc(c.name)} <span class="badge bgr">${camType(c.url,c.type)}</span> ${warn(c)}</div><div style="font-size:11px;color:var(--text3);word-break:break-all">${esc(c.url)}</div></div>${dir?`<button class="tbl-del" data-cmdel="${c.id}"><i class="ti ti-trash"></i></button>`:''}</div>${player(c)}</div>`).join('')
      : `<div class="cam-ph"><i class="ti ti-video"></i><p style="font-size:14px;color:var(--text2);margin-bottom:6px">Sin cámaras conectadas</p><p style="font-size:12px;color:var(--text3);line-height:1.7">Agregá la URL del stream. Soporta <b>YouTube Live</b>, <b>HLS (.m3u8)</b>, <b>imagen / snapshot</b> de la cámara (se refresca sola) o el <b>visor web</b> del fabricante.<br>Si tu cámara solo da <b>RTSP</b>, hace falta un servicio que lo convierta a HLS, o transmitir a YouTube Live.</p></div>`}
    </div>`;
}

export function rProyectos(){
  const dir = isDirector();
  const ps = dir ? D.projects : D.projects.filter(p => p.name === S.user.project);
  const tSpent = ps.reduce((a,p)=>a+p.spent,0), tSale = ps.reduce((a,p)=>a+p.salePrice,0), tBudget = ps.reduce((a,p)=>a+p.budget,0);
  return `
  <div class="topbar">
    <div><h1>PROYECTOS</h1><div class="topbar-sub">${ps.length} proyecto${ps.length!==1?'s':''} activos</div></div>
    ${dir?`<div class="topbar-actions"><button class="btn-or" id="new-proj"><i class="ti ti-plus"></i> Nuevo proyecto</button></div>`:''}
  </div>
  <div class="content">
    ${dir?`<div class="kpi-grid">
      <div class="kpi"><i class="ti ti-building"></i><div class="kpi-lbl">Proyectos activos</div><div class="kpi-val">${ps.length}</div></div>
      <div class="kpi"><i class="ti ti-cash"></i><div class="kpi-lbl">Total gastado</div><div class="kpi-val">${fmtK(tSpent)}</div></div>
      <div class="kpi"><i class="ti ti-trending-up"></i><div class="kpi-lbl">Venta proyectada</div><div class="kpi-val">${fmtK(tSale)}</div></div>
      <div class="kpi"><i class="ti ti-coin"></i><div class="kpi-lbl">Ganancia estimada</div><div class="kpi-val gr">${fmtK(tSale-tBudget)}</div></div>
    </div>`:''}
    ${ps.length===0?`<div class="sec" style="text-align:center;color:var(--text3);padding:3rem"><i class="ti ti-building-off" style="font-size:34px;display:block;margin-bottom:10px"></i>Todavía no hay proyectos. Creá el primero con «Nuevo proyecto».</div>`:''}
    <div class="proj-grid">
      ${ps.map(p=>`
      <div class="proj-card" data-op="${p.id}">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
          <div style="font-size:15px;font-weight:600">${esc(p.name)}</div>${sBadge(p.status)}</div>
        <div style="font-size:12px;color:var(--text2);margin-bottom:14px;display:flex;align-items:center;gap:4px"><i class="ti ti-map-pin" style="font-size:12px"></i>${esc(p.address)}</div>
        <div style="margin-bottom:14px">
          <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text2);margin-bottom:6px"><span>Avance de obra</span><span style="color:var(--orange);font-weight:600">${p.progress}%</span></div>
          <div class="prog-bar" style="height:8px"><div class="prog-fill" style="width:${p.progress}%"></div></div></div>
        <div style="display:flex;gap:0;border-top:1px solid var(--border);padding-top:12px">
          <div style="flex:1;padding-right:12px;border-right:1px solid var(--border)"><div style="font-size:10px;color:var(--text3);margin-bottom:3px">PRESUPUESTO</div><div style="font-size:13px;font-weight:500">${fmtK(p.budget)}</div></div>
          <div style="flex:1;padding:0 12px;border-right:1px solid var(--border)"><div style="font-size:10px;color:var(--text3);margin-bottom:3px">GASTADO</div><div style="font-size:13px;font-weight:500">${fmtK(p.spent)}</div></div>
          <div style="flex:1;padding-left:12px"><div style="font-size:10px;color:var(--text3);margin-bottom:3px">VENTA EST.</div><div style="font-size:13px;font-weight:600;color:var(--orange)">${fmtK(p.salePrice)}</div></div>
        </div>
      </div>`).join('')}
    </div>
  </div>`;
}

export function rProjD(){
  const p = D.projects.find(x => x.id === S.proj); if(!p) return '';
  const dir = isDirector(), tab = S.tab; let body = '';
  if(tab==='estado') body = `
    <div class="sec"><h3>Descripción y avance actual</h3>
      <p style="font-size:13px;color:var(--text2);margin-bottom:1.25rem;line-height:1.6">${esc(p.description)}</p>
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:8px"><div class="prog-bar" style="flex:1;height:12px"><div class="prog-fill" style="width:${p.progress}%"></div></div><span style="font-size:16px;font-weight:700;color:var(--orange);min-width:48px">${p.progress}%</span></div>
      <div style="display:flex;gap:20px;font-size:12px;color:var(--text3);margin-top:8px"><span><i class="ti ti-calendar-event" style="margin-right:4px"></i>Inicio: ${p.startDate}</span><span><i class="ti ti-calendar-check" style="margin-right:4px"></i>Entrega: ${p.endDate}</span></div></div>
    <div class="sec"><h3><span>Historial de actualizaciones</span>${dir?`<button class="btn-or sm" id="new-update"><i class="ti ti-plus"></i> Actualización</button>`:''}</h3>
      ${p.updates.length?p.updates.map((u,idx)=>`<div class="upd-entry"><div class="upd-date"><i class="ti ti-clock" style="font-size:11px"></i>${u.date}${typeof u.progress==='number'?' &middot; <span class="badge bb">'+u.progress+'% obra</span>':''}${dir?`<button class="tbl-del" data-updel="${idx}" style="margin-left:auto"><i class="ti ti-x"></i></button>`:''}</div><div>${esc(u.text)}</div>${(u.photos&&u.photos.length)?'<div class="upd-photos">'+u.photos.map(ph=>'<img class="upd-photo" data-photo="'+ph.path+'" data-rview="'+ph.path+'" data-rname="'+esc(ph.name||'foto')+'" alt="">').join('')+'</div>':''}</div>`).join(''):`<div style="color:var(--text3);font-size:13px">Sin actualizaciones cargadas.</div>`}</div>`;
  else if(tab==='planos') body = rPlanos(p, dir);
  else if(tab==='3d') body = r3D(p, dir);
  else if(tab==='camara') body = rCamaras(p, dir);
  else if(tab==='finanzas'){
    const g = p.salePrice - p.budget, pct = p.budget ? Math.round((g/p.budget)*100) : 0;
    const projInvest = D.investments.filter(i => i.projectId != null ? i.projectId === p.id : i.project === p.name);
    const invTotal = projInvest.reduce((a,i)=>a+i.amount,0);
    body = `
    <div class="two-col">
      <div class="sec"><h3>Resumen financiero</h3>
        <div class="stat-row"><span class="sl">Capital invertido</span><span class="sv">${fmt(invTotal)}</span></div>
        <div class="stat-row"><span class="sl">Total gastado</span><span class="sv">${fmt(p.spent)}</span></div>
        <div class="stat-row"><span class="sl">Presupuesto total</span><span class="sv">${fmt(p.budget)}</span></div>
        <div class="stat-row"><span class="sl">Precio de venta est.</span><span class="sv">${fmt(p.salePrice)}</span></div>
        <div class="stat-row"><span class="sl">Ganancia proyectada</span><span class="sv gr">${fmt(g)} (${pct}%)</span></div></div>
      <div class="sec"><h3>Distribución financiera</h3><div class="bar-chart">
        ${[['Gastado',p.spent,'#f97316'],['Presupuesto',p.budget,'#f59e0b'],['Venta est.',p.salePrice,'#22c55e']].map(([l,vv,c])=>`<div class="bar-wrap"><div class="bar-val">${fmtK(vv)}</div><div class="bar" style="height:${Math.round((vv/Math.max(p.spent,p.budget,p.salePrice,1))*80)+10}px;background:${c}"></div><div class="bar-lbl">${l}</div></div>`).join('')}
      </div></div>
    </div>
    ${dir?`<div class="sec"><h3>Inversores del proyecto</h3>${projInvest.length?`<table><thead><tr><th>Inversor</th><th>Monto aportado</th><th>Participación</th><th>Fecha</th></tr></thead><tbody>${projInvest.map(i=>`<tr><td>${esc(i.investor)}</td><td style="font-weight:500;color:var(--orange)">${fmt(i.amount)}</td><td><span class="badge bb">${i.pct}%</span></td><td>${i.date}</td></tr>`).join('')}</tbody></table>`:`<div style="color:var(--text3);font-size:13px">Sin inversores en este proyecto.</div>`}</div>`:''}`;
  }
  return `
  <div class="topbar">
    <button class="back-btn" id="back"><i class="ti ti-arrow-left"></i> Proyectos</button>
    <div><h1>${esc(p.name.toUpperCase())}</h1><div class="topbar-sub"><i class="ti ti-map-pin" style="font-size:12px;margin-right:3px"></i>${esc(p.address)}</div></div>
    <div class="topbar-actions">${sBadge(p.status)}${dir?`<button class="btn-sec" id="edit-proj"><i class="ti ti-edit"></i> Editar</button><button class="btn-del" data-delproj="${p.id}"><i class="ti ti-trash"></i></button>`:''}</div>
  </div>
  <div class="content">
    <div class="tabs">
      <button class="tab ${tab==='estado'?'active':''}" data-tab="estado"><i class="ti ti-clipboard-list"></i> Estado</button>
      <button class="tab ${tab==='planos'?'active':''}" data-tab="planos"><i class="ti ti-ruler-2"></i> Planos 2D</button>
      <button class="tab ${tab==='3d'?'active':''}" data-tab="3d"><i class="ti ti-cube"></i> 3D y multimedia</button>
      <button class="tab ${tab==='camara'?'active':''}" data-tab="camara"><i class="ti ti-video"></i> Cámara</button>
      <button class="tab ${tab==='finanzas'?'active':''}" data-tab="finanzas"><i class="ti ti-chart-bar"></i> Finanzas</button>
    </div>${body}
  </div>`;
}
