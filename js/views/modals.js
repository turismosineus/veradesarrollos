// Todos los modales (alta/edición) en un solo lugar.
import { S, D } from '../state.js';
import { UNITS, EXP_CATS, OFICIOS, PLAN_CATS, PROV_KINDS } from '../constants.js';
const laborFirst = p => (p.kind==='mano de obra'||p.kind==='profesional') ? 0 : 1;
import { esc, today, nextOrderNo, projOptions, fmt } from '../utils.js';

const drop = (prefix, label, hint, multi, accept) => `
  <input type="file" id="${prefix}-file" ${multi?'multiple':''} accept="${accept||'.pdf,.jpg,.jpeg,.png,.webp,image/*,application/pdf'}" style="display:none">
  <label class="file-drop" id="${prefix}-drop" for="${prefix}-file"><i class="ti ti-cloud-upload"></i><b id="${prefix}-file-lbl">${label}</b>${hint?`<span style="font-size:12px">${hint}</span>`:''}</label>`;

export function rModal(){
  const m = S.modal;
  const X = `<button class="mc" id="close-modal" title="Cerrar"><i class="ti ti-x"></i></button>`;
  const shell = (title, sub, body, footBtnId, footLabel, wide) => `<div class="modal-overlay"><div class="modal"${wide?' style="max-width:580px"':''}><div class="modal-header"><div class="modal-header-text"><h2>${title}</h2><p>${sub}</p></div>${X}</div>
    <div class="modal-body">${body}</div>
    <div class="modal-footer"><button class="btn-modal-sec" id="close-modal">Cancelar</button><button class="btn-modal-or" id="${footBtnId}">${footLabel}</button></div></div></div>`;

  if(m==='new-proj' || m==='edit-proj'){
    const ed = m==='edit-proj' ? D.projects.find(x=>x.id===S.proj) : null;
    return shell(ed?'Editar proyecto':'Nuevo proyecto', 'Completá los datos del proyecto', `
      <div class="fl"><label>Nombre del proyecto <span class="req">*</span></label><input class="fi" id="np-name" value="${ed?esc(ed.name):''}" placeholder="Ej. Torre Godoy Cruz"></div>
      <div class="fl"><label>Dirección / Ubicación <span class="req">*</span></label><input class="fi" id="np-addr" value="${ed?esc(ed.address):''}" placeholder="Calle, número, localidad, provincia"></div>
      <div class="frow"><div class="fl"><label>Estado</label><select class="fi" id="np-status">${[['planificacion','Planificación'],['construccion','En construcción'],['pausado','Pausado'],['finalizado','Finalizado']].map(([k,l])=>`<option value="${k}" ${ed&&ed.status===k?'selected':''}>${l}</option>`).join('')}</select></div>
        <div class="fl"><label>Avance de obra (%)</label><input class="fi" id="np-prog" type="number" min="0" max="100" value="${ed?ed.progress:0}"></div></div>
      <div class="frow"><div class="fl"><label>Presupuesto total ($) <span class="req">*</span></label><input class="fi" id="np-budget" type="number" value="${ed?ed.budget:''}" placeholder="0"></div>
        <div class="fl"><label>Precio de venta estimado ($)</label><input class="fi" id="np-sale" type="number" value="${ed?ed.salePrice:''}" placeholder="0"></div></div>
      <div class="frow"><div class="fl"><label>Fecha de inicio</label><input class="fi" id="np-start" type="date" value="${ed?ed.startDate||'':''}"></div>
        <div class="fl"><label>Fecha de entrega estimada</label><input class="fi" id="np-end" type="date" value="${ed?ed.endDate||'':''}"></div></div>
      <div style="font-size:11px;color:#6b7280;margin:-6px 0 12px">El "gastado" ya no se carga a mano: se calcula solo con los gastos y liquidaciones del proyecto.</div>
      <div class="fl"><label>Descripción del proyecto</label><textarea class="fi" id="np-desc" placeholder="Tipo de obra, características principales, etc.">${ed?esc(ed.description):''}</textarea></div>`,
      'save-proj', ed?'Guardar cambios':'Crear proyecto');
  }

  if(m==='new-prov'){
    const ed = S.editId ? D.providers.find(p=>p.id==S.editId) : null;
    return shell(ed?'Editar proveedor':'Nuevo proveedor', 'Estos datos se usan en presupuestos, órdenes, liquidaciones y comprobantes', `
      <div class="fl"><label>Nombre / Empresa <span class="req">*</span></label><input class="fi" id="nv-name" value="${ed?esc(ed.name):''}" placeholder="Ej. Materiales del Sur SA, Juan Pérez (albañil), Arq. García"></div>
      <div class="fl"><label>Tipo de proveedor <span class="req">*</span></label><select class="fi" id="nv-kind">${PROV_KINDS.map(k=>`<option ${ed&&(ed.kind||'materiales')===k?'selected':''}>${k}</option>`).join('')}</select><div style="font-size:11px;color:#6b7280;margin-top:4px">Albañiles, electricistas, plomeros → <b>mano de obra</b>. Arquitectos, ingenieros, agrimensores → <b>profesional</b>.</div></div>
      <div class="frow"><div class="fl"><label>Rubro <span class="req">*</span></label><input class="fi" id="nv-rubro" value="${ed?esc(ed.rubro||''):''}" placeholder="Materiales, Electricidad..."></div>
        <div class="fl"><label>Nombre de contacto</label><input class="fi" id="nv-contact" value="${ed?esc(ed.contact||''):''}" placeholder="Nombre y apellido"></div></div>
      <div class="frow"><div class="fl"><label>Teléfono</label><input class="fi" id="nv-phone" value="${ed?esc(ed.phone||''):''}" placeholder="261-4000000"></div>
        <div class="fl"><label>Email</label><input class="fi" id="nv-email" type="email" value="${ed?esc(ed.email||''):''}" placeholder="ventas@empresa.com"></div></div>`,
      'save-prov', ed?'Guardar cambios':'Guardar proveedor');
  }

  if(m==='new-order'){
    const items = S.mi, total = items.reduce((a,i)=>a+(Number(i.qty)||0)*(Number(i.price)||0),0);
    return shell('Nueva orden de compra', 'Registrá los ítems con cantidad, unidad y precio unitario', `
      <div class="frow"><div class="fl"><label>N° de orden <span class="req">*</span></label><input class="fi" id="no-num" value="${nextOrderNo()}"></div>
        <div class="fl"><label>Fecha <span class="req">*</span></label><input class="fi" id="no-date" type="date" value="${today()}"></div></div>
      <div class="fl"><label>Proyecto relacionado</label><select class="fi" id="no-project">${projOptions()}</select></div>
      <hr class="fdivider"><div class="fsec-lbl">Ítems de la orden</div>
      <div class="items-col-head"><span>Descripción</span><span>Cantidad</span><span>Unidad</span><span>P. unitario</span><span></span></div>
      <div id="mitems">${items.map((it,idx)=>`<div class="item-grid"><input class="idesc" value="${esc(it.desc)}" placeholder="Ej. Hierro 12mm" data-idx="${idx}"><input class="iqty" value="${it.qty}" type="number" min="0" placeholder="0" data-idx="${idx}"><select class="iunit" data-idx="${idx}">${UNITS.map(u=>`<option ${u===it.unit?'selected':''}>${u}</option>`).join('')}</select><input class="iprice" value="${it.price}" type="number" min="0" placeholder="0" data-idx="${idx}"><button class="rm-btn" data-rm="${idx}"><i class="ti ti-trash"></i></button></div>`).join('')}</div>
      <button class="add-item-btn" id="add-item"><i class="ti ti-plus"></i> Agregar ítem</button>
      <div class="modal-total-row"><span>Total estimado de la orden:</span><span class="modal-total-val" id="mtotal">${fmt(total)}</span></div>`,
      'save-order', 'Crear orden de compra', true);
  }

  if(m==='new-investor'){
    const ed = S.editId ? D.investments.find(x=>x.id==S.editId) : null;
    const pre = ed ? ed.investor : (S.invName||'');
    return shell(ed?'Editar aporte':'Registrar aporte de inversor', 'Ingresá los datos del aporte', `
      <div class="fl"><label>Nombre del inversor <span class="req">*</span></label><input class="fi" id="ni-name" value="${esc(pre)}" placeholder="Nombre completo o razón social"></div>
      <div class="frow"><div class="fl"><label>Proyecto <span class="req">*</span></label><select class="fi" id="ni-project">${projOptions(ed?ed.projectId:(S.invProjId||undefined))}</select></div>
        <div class="fl"><label>Monto aportado ($) <span class="req">*</span></label><input class="fi" id="ni-amount" type="number" value="${ed?ed.amount:''}" placeholder="0"></div></div>
      <div class="frow"><div class="fl"><label>Participación (%)</label><input class="fi" id="ni-pct" type="number" min="0" max="100" value="${ed?ed.pct:''}" placeholder="0"></div>
        <div class="fl"><label>Fecha del aporte</label><input class="fi" id="ni-date" type="date" value="${ed?(ed.date||''):today()}"></div></div>
      <div class="fl"><label>Notas</label><textarea class="fi" id="ni-note" placeholder="Condiciones, porcentaje acordado, etc.">${ed?esc(ed.note||''):''}</textarea></div>`,
      'save-investor', ed?'Guardar cambios':'Registrar aporte');
  }

  if(m==='new-exp'){
    const ed = S.editId ? D.expenses.find(x=>x.id==S.editId) : null;
    return shell(ed?'Editar gasto':'Registrar gasto', 'Compra de materiales, equipos, servicios, etc.', `
      <div class="fl"><label>Concepto <span class="req">*</span></label><input class="fi" id="ne-concept" value="${ed?esc(ed.concept):''}" placeholder="Descripción del gasto"></div>
      <div class="frow"><div class="fl"><label>Categoría</label><select class="fi" id="ne-cat"><option value="">Seleccioná categoría</option>${EXP_CATS.map(c=>`<option ${ed&&ed.category===c?'selected':''}>${c}</option>`).join('')}</select></div>
        <div class="fl"><label>Monto ($) <span class="req">*</span></label><input class="fi" id="ne-amount" type="number" value="${ed?ed.amount:''}" placeholder="0"></div></div>
      <div class="frow"><div class="fl"><label>Proyecto</label><select class="fi" id="ne-project">${projOptions(ed?ed.projectId:undefined)}</select></div>
        <div class="fl"><label>Proveedor</label><select class="fi" id="ne-provider"><option value="">— Sin proveedor —</option>${D.providers.map(p=>`<option value="${p.id}" ${ed&&ed.providerId==p.id?'selected':''}>${esc(p.name)}</option>`).join('')}</select></div></div>
      <div class="fl"><label>Fecha del gasto</label><input class="fi" id="ne-date" type="date" value="${ed?(ed.date||''):today()}"></div>
      <div class="fl"><label>Factura ${ed&&ed.fileId?'(ya hay una cargada — elegí otra solo si querés reemplazarla)':'(opcional)'}</label>${drop('ex', 'Adjuntar factura (PDF o imagen)', '', false)}</div>`,
      'save-exp', ed?'Guardar cambios':'Registrar gasto');
  }

  if(m==='new-liquidacion'){
    const ed = S.editId ? (D.liquidaciones||[]).find(x=>x.id==S.editId) : null;
    return shell(ed?'Editar liquidación':'Registrar liquidación', 'Pago de mano de obra (electricista, albañil, arquitecto, etc.)', `
      <div class="fl"><label>Proveedor / Profesional que cobra <span class="req">*</span></label><select class="fi" id="nl-prov"><option value="">— Elegí quién cobra —</option>${[...D.providers].sort((a,b)=>laborFirst(a)-laborFirst(b)).map(p=>`<option value="${p.id}" ${ed&&(ed.providerId==p.id||(!ed.providerId&&ed.worker===p.name))?'selected':''}>${esc(p.name)} — ${esc(p.rubro||'')} (${esc(p.kind||'materiales')})</option>`).join('')}</select><div style="font-size:11px;color:#6b7280;margin-top:4px">Si no aparece, cargalo primero en <b>Proveedores</b> como "mano de obra" o "profesional".</div></div>
      <div class="fl"><label>Monto ($) <span class="req">*</span></label><input class="fi" id="nl-amount" type="number" value="${ed?ed.amount:''}" placeholder="0"></div>
      <div class="frow"><div class="fl"><label>Proyecto</label><select class="fi" id="nl-project">${projOptions(ed?ed.projectId:undefined)}</select></div>
        <div class="fl"><label>Fecha</label><input class="fi" id="nl-date" type="date" value="${ed?(ed.date||''):today()}"></div></div>
      <div class="fl"><label>Nota</label><input class="fi" id="nl-note" value="${ed?esc(ed.note||''):''}" placeholder="Ej. quincena, etapa de obra, etc."></div>`,
      'save-liq', ed?'Guardar cambios':'Registrar liquidación');
  }

  if(m==='new-receipt'){
    const prov = D.providers.find(p=>p.id===S.prov);
    return shell('Cargar comprobante', 'Factura o recibo de pago de '+esc(prov?prov.name:''), `
      <div class="fl"><label>Archivo <span class="req">*</span></label>${drop('rc', 'Elegí un PDF o imagen', 'Factura, recibo o comprobante de pago', false)}</div>
      <div class="frow"><div class="fl"><label>Monto ($)</label><input class="fi" id="rc-amount" type="number" placeholder="0"></div>
        <div class="fl"><label>Fecha</label><input class="fi" id="rc-date" type="date" value="${today()}"></div></div>
      <div class="frow"><div class="fl"><label>Proyecto</label><select class="fi" id="rc-project"><option value="">— Sin proyecto —</option>${projOptions()}</select></div>
        <div class="fl"><label>Orden relacionada</label><select class="fi" id="rc-order"><option value="">— Ninguna —</option>${(prov?prov.orders:[]).map(o=>`<option>${o.id}</option>`).join('')}</select></div></div>
      <div class="fl"><label>Nota</label><input class="fi" id="rc-note" placeholder="Ej. Pago parcial, N° de factura, etc."></div>`,
      'save-receipt', 'Guardar comprobante');
  }

  if(m==='new-budget'){
    const fromProj = S.bdCtx === 'project';
    const prov = fromProj ? null : D.providers.find(p=>p.id===S.prov);
    const proj = fromProj ? D.projects.find(p=>p.id===S.proj) : null;
    const ed = (!fromProj && S.editId) ? ((prov&&prov.budgets)||[]).find(b=>b.id==S.editId) : null;
    return shell(ed?'Editar presupuesto':'Cargar presupuesto', fromProj ? 'Para el proyecto '+esc(proj?proj.name:'') : 'Presupuesto de '+esc(prov?prov.name:''), `
      ${fromProj ? `<div class="fl"><label>Proveedor <span class="req">*</span></label><select class="fi" id="bd-prov"><option value="">— Elegí quién presupuesta —</option>${D.providers.map(p=>`<option value="${p.id}">${esc(p.name)} — ${esc(p.rubro||'')} (${esc(p.kind||'materiales')})</option>`).join('')}</select></div>` : ''}
      <div class="fl"><label>Concepto <span class="req">*</span></label><input class="fi" id="bd-concept" value="${ed?esc(ed.concept||''):''}" placeholder="Ej. Aberturas, Instalación eléctrica, Hierro..."><div style="font-size:11px;color:#6b7280;margin-top:4px">Usá el mismo concepto en distintos proveedores para poder compararlos.</div></div>
      <div class="fl"><label>Archivo ${ed&&ed.fileId?'(ya hay uno cargado — elegí otro solo si querés reemplazarlo)':'(opcional)'}</label>${drop('bd', 'Arrastrá el PDF o hacé click', '', false)}</div>
      <div class="frow"><div class="fl"><label>Monto ($) <span class="req">*</span></label><input class="fi" id="bd-amount" type="number" value="${ed?ed.amount:''}" placeholder="0"></div>
        ${fromProj ? '' : `<div class="fl"><label>Proyecto</label><select class="fi" id="bd-project"><option value="">— Sin proyecto —</option>${projOptions(ed?ed.projectId:undefined)}</select></div>`}</div>
      <div class="frow"><div class="fl"><label>Fecha</label><input class="fi" id="bd-date" type="date" value="${ed?(ed.date||''):today()}"></div>
        <div class="fl"><label>Nota</label><input class="fi" id="bd-note" value="${ed?esc(ed.note||''):''}" placeholder="Validez, condiciones, etc."></div></div>`,
      'save-budget', ed?'Guardar cambios':'Guardar presupuesto');
  }

  if(m==='new-inv-doc') return shell('Subir documento', 'Contrato, recibo o comprobante de '+esc(S.inv||''), `
      <div class="fl"><label>Archivo <span class="req">*</span></label>${drop('id', 'Elegí un PDF o imagen', '', false)}</div>
      <div class="frow"><div class="fl"><label>Tipo</label><select class="fi" id="id-kind"><option>contrato</option><option>recibo</option><option>comprobante de aporte</option><option>otro</option></select></div>
        <div class="fl"><label>Fecha</label><input class="fi" id="id-date" type="date" value="${today()}"></div></div>
      <div class="fl"><label>Nota</label><input class="fi" id="id-note" placeholder="Detalle opcional"></div>`,
      'save-inv-doc', 'Guardar documento');

  if(m==='new-update'){
    const pr = D.projects.find(x => x.id === S.proj) || {};
    return shell('Nueva actualización de obra', 'Registrá el avance, el porcentaje y fotos', `
      <div class="frow"><div class="fl"><label>Fecha</label><input class="fi" id="nu-date" type="date" value="${today()}"></div>
        <div class="fl"><label>Avance de obra (%) <span class="req">*</span></label><input class="fi" id="nu-prog" type="number" min="0" max="100" value="${pr.progress||0}"></div></div>
      <div class="fl"><label>Detalle de la actualización <span class="req">*</span></label><textarea class="fi" id="nu-text" placeholder="Ej. Se completó el encofrado del piso 3; se inició la instalación eléctrica..."></textarea></div>
      <div class="fl"><label>Fotos del avance (opcional)</label>${drop('nu', 'Arrastrá fotos o hacé click', 'Podés subir varias', true, 'image/*')}</div>`,
      'save-update', 'Guardar actualización');
  }

  if(m==='new-media-link') return shell('Agregar link', 'Modelo 3D (Sketchfab), recorrido 360° (Matterport / Kuula) o video (YouTube / Vimeo)', `
      <div class="fl"><label>URL <span class="req">*</span></label><input class="fi" id="ml-url" placeholder="https://sketchfab.com/3d-models/...  o  https://youtu.be/..."></div>
      <div class="fl"><label>Título</label><input class="fi" id="ml-title" placeholder="Ej. Modelo 3D fachada, Recorrido planta baja..."></div>
      <div class="fl"><label>Nota</label><input class="fi" id="ml-note" placeholder="Opcional"></div>`, 'save-media-link', 'Agregar');

  if(m==='new-media-img') return shell('Subir imágenes', 'Renders, fotos del modelo, capturas — podés subir varias', `
      <div class="fl"><label>Imágenes <span class="req">*</span></label>${drop('mi', 'Arrastrá imágenes o hacé click', 'JPG, PNG, WEBP', true, 'image/*')}</div>
      <div class="fl"><label>Nota</label><input class="fi" id="mi-note" placeholder="Opcional (se aplica a todas)"></div>`, 'save-media-img', 'Subir');

  if(m==='new-media-vid') return shell('Subir video', 'Para videos largos conviene subirlo a YouTube y usar "Agregar link"', `
      <div class="fl"><label>Video <span class="req">*</span></label>${drop('mv', 'Arrastrá el video o hacé click', 'MP4 o WEBM — recomendado menos de 50 MB', false, 'video/*')}</div>
      <div class="frow"><div class="fl"><label>Título</label><input class="fi" id="mv-title" placeholder="Ej. Recorrido animado"></div><div class="fl"><label>Nota</label><input class="fi" id="mv-note" placeholder="Opcional"></div></div>`, 'save-media-vid', 'Subir');

  if(m==='new-camera') return shell('Agregar cámara', 'Pegá la URL del stream y elegí el tipo (o dejá "auto")', `
      <div class="fl"><label>Nombre</label><input class="fi" id="cm-name" placeholder="Ej. Cámara frente, Cámara obra 2"></div>
      <div class="fl"><label>URL del stream <span class="req">*</span></label><input class="fi" id="cm-url" placeholder="https://..."><div style="font-size:11px;color:#6b7280;margin-top:4px">Tiene que empezar con <b>https://</b> — las URL <i>http</i> las bloquea el navegador.</div></div>
      <div class="fl"><label>Tipo</label><select class="fi" id="cm-type"><option value="auto">Auto-detectar</option><option value="youtube">YouTube Live</option><option value="hls">HLS (.m3u8)</option><option value="image">Imagen / snapshot (se refresca sola)</option><option value="video">Video directo (mp4 / webm)</option><option value="iframe">Visor web del fabricante (iframe)</option></select></div>`, 'save-camera', 'Agregar cámara');

  if(m==='new-plan') return shell('Subir planos', 'Elegí la categoría y arrastrá o seleccioná uno o varios archivos', `
      <div class="fl"><label>Categoría <span class="req">*</span></label><select class="fi" id="pl-cat">${PLAN_CATS.map(c=>`<option>${c}</option>`).join('')}</select></div>
      <div class="fl"><label>Archivos <span class="req">*</span></label>${drop('pl', 'Arrastrá acá o hacé click para elegir', 'PDF o imágenes — podés seleccionar varios', true)}</div>
      <div class="frow"><div class="fl"><label>Fecha</label><input class="fi" id="pl-date" type="date" value="${today()}"></div>
        <div class="fl"><label>Nota</label><input class="fi" id="pl-note" placeholder="Opcional"></div></div>`,
      'save-plan', 'Subir');

  if(m==='new-revision') return shell('Nueva revisión', esc(S.revCat||'')+' · '+esc(S.revName||''), `
      <div class="fl"><label>Archivo <span class="req">*</span></label>${drop('pr', 'Arrastrá acá o hacé click', 'La revisión anterior queda marcada como obsoleta', false)}</div>
      <div class="frow"><div class="fl"><label>Fecha</label><input class="fi" id="pr-date" type="date" value="${today()}"></div>
        <div class="fl"><label>Nota</label><input class="fi" id="pr-note" placeholder="Qué cambió en esta revisión"></div></div>`,
      'save-revision', 'Subir revisión');

  return '';
}
