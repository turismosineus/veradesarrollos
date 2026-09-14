// Núcleo de la app. render() dibuja la vista; bind() conecta los eventos.
// Los datos viven en Supabase: cada acción llama a db.*, recarga y vuelve a dibujar.
import { S, D, ui } from './state.js';
import { OSTATUS } from './constants.js';
import { el, v, nv, today, toast, nextOrderNo } from './utils.js';
import { viewFile, dlFile, signedUrl } from './files.js';
import { rLogin } from './views/login.js';
import { rApp } from './views/shell.js';
import { signIn, signOut, getProfile, currentSession } from './auth.js';
import * as db from './db.js';

let camTimers = [], hlsList = [];
export function render(){
  camTimers.forEach(clearInterval); camTimers = [];
  hlsList.forEach(h => { try{ h.destroy(); }catch(e){} }); hlsList = [];
  el('root').innerHTML = S.page === 'login' ? rLogin() : rApp(); bind();
}

async function refresh(){ try{ await db.loadAll(); }catch(e){ toast('No pude cargar los datos'); console.error(e); } render(); }

export async function init(){
  try{
    const session = await currentSession();
    if(session && session.user){
      const prof = await getProfile(session.user.id);
      S.user = { id: session.user.id, email: session.user.email, name: prof.full_name || session.user.email, role: prof.role || 'inversor', project: prof.project || null };
      S.page = 'proyectos';
      await db.loadAll();
    }
  }catch(e){ /* sin sesión válida */ }
  render();
}

async function run(fn, okMsg){
  try{ await fn(); if(okMsg) toast(okMsg); await refresh(); }
  catch(e){ console.error(e); toast('Ocurrió un error. Revisá e intentá de nuevo.'); }
}

// Dado el ID elegido en un select, devuelve {projectId, project(nombre)} (o nulos si no eligió).
// Lee moneda + cotización de un formulario; devuelve null si falta la cotización en pesos.
const curOf = (px, required = true) => { const currency = v(px+'-cur') || 'ARS'; const rate = currency === 'USD' ? null : (nv(px+'-rate') || null); if(required && currency === 'ARS' && !rate){ toast('Ingresá la cotización del dólar de ese día'); return null; } return { currency, rate }; };
const pidOf = id => { const p = D.projects.find(x => x.id == id); return p ? { projectId:p.id, project:p.name } : { projectId:null, project:'' }; };
const closeModal = () => { S.modal = null; S.editId = null; ui.pendingFile = null; ui.pendingFiles = []; render(); };

// Zona de carga: click + arrastrar-y-soltar. multi=true guarda en ui.pendingFiles, si no en ui.pendingFile.
function wireDrop(dropId, inputId, multi){
  const drop = el(dropId), inp = el(inputId); if(!drop || !inp) return;
  const lbl = el(dropId.replace('-drop', '-file-lbl'));
  const set = list => {
    const arr = Array.from(list || []);
    if(multi) ui.pendingFiles = arr; else ui.pendingFile = arr[0] || null;
    if(lbl) lbl.textContent = arr.length ? (arr.length === 1 ? arr[0].name : arr.length + ' archivos seleccionados') : 'Arrastrá acá o hacé click';
    drop.classList.toggle('has', arr.length > 0);
  };
  inp.addEventListener('change', e => set(e.target.files));
  ['dragenter','dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('drag'); }));
  drop.addEventListener('dragleave', e => { e.preventDefault(); drop.classList.remove('drag'); });
  drop.addEventListener('drop', e => { e.preventDefault(); drop.classList.remove('drag'); set(e.dataTransfer.files); });
}

function bind(){
  // ── Login / sesión ──
  el('lbtn')?.addEventListener('click', async () => {
    const email = v('lu'), pass = el('lp').value, btn = el('lbtn');
    if(btn){ btn.disabled = true; btn.textContent = 'Ingresando...'; }
    try{
      const user = await signIn(email, pass); const prof = await getProfile(user.id);
      S.user = { id:user.id, email:user.email, name:prof.full_name || user.email, role:prof.role || 'inversor', project:prof.project || null };
      await db.loadAll(); S.page = 'proyectos'; render();
    }catch(err){ console.error(err); const e = el('lerr'); if(e) e.textContent = 'Email o contraseña incorrectos'; if(btn){ btn.disabled = false; btn.textContent = 'Ingresar al sistema'; } }
  });
  ['lu','lp'].forEach(id => el(id)?.addEventListener('keydown', e => { if(e.key === 'Enter') el('lbtn')?.click(); }));
  el('logout')?.addEventListener('click', async () => { await signOut(); S.user = null; S.page = 'login'; D.projects = []; D.providers = []; D.expenses = []; D.liquidaciones = []; D.investments = []; D.investorDocs = []; render(); });

  // ── Navegación ──
  el('mob-menu')?.addEventListener('click', () => document.querySelector('.app')?.classList.toggle('nav-open'));
  el('sb-backdrop')?.addEventListener('click', () => document.querySelector('.app')?.classList.remove('nav-open'));
  document.querySelectorAll('[data-nav]').forEach(x => x.addEventListener('click', () => { S.page = x.dataset.nav; S.tab = x.dataset.nav === 'proveedores' ? 'info' : (x.dataset.nav === 'finanzas' ? 'liquidaciones' : 'estado'); render(); }));
  document.querySelectorAll('[data-tab]').forEach(x => x.addEventListener('click', () => { S.tab = x.dataset.tab; if(S.tab === 'finanzas') S.ftab = 'panel'; render(); }));
  el('set-ref-rate')?.addEventListener('click', () => { const cur = (D.settings && D.settings.refRate) || ''; const r = prompt('Dólar de referencia (pesos por 1 USD) para valuar los saldos pendientes:', cur); if(r === null) return; const n = parseFloat(String(r).replace(',', '.')); if(!n || n <= 0){ toast('Ingresá un número válido'); return; } run(() => db.setRefRate(n), 'Dólar de referencia actualizado'); });
  document.querySelectorAll('[data-ftab]').forEach(x => x.addEventListener('click', () => { S.ftab = x.dataset.ftab; render(); }));
  document.querySelectorAll('[data-openfin]').forEach(x => x.addEventListener('click', () => { S.proj = +x.dataset.openfin; S.page = 'proj-d'; S.tab = 'finanzas'; S.ftab = 'panel'; render(); }));
  document.querySelectorAll('[data-pfilter]').forEach(x => x.addEventListener('click', () => { S.provFilter = x.dataset.pfilter; render(); }));
  el('back')?.addEventListener('click', () => { S.page = S.page === 'proj-d' ? 'proyectos' : 'proveedores'; S.tab = S.page === 'proveedores' ? 'info' : 'estado'; render(); });
  el('back-order')?.addEventListener('click', () => { S.page = 'prov-d'; S.tab = 'ordenes'; render(); });
  el('back-inv')?.addEventListener('click', () => { S.page = 'inversores'; render(); });
  el('proj-q')?.addEventListener('input', e => { S.projQ = e.target.value; S.projQFocus = true; render(); });
  el('proj-status')?.addEventListener('change', e => { S.projStatus = e.target.value; render(); });
  document.querySelectorAll('[data-psort]').forEach(x => x.addEventListener('click', () => { const k = x.dataset.psort; const cur = S.projSort || { key:'createdAt', dir:'desc' }; S.projSort = { key:k, dir: cur.key === k && cur.dir === 'desc' ? 'asc' : (cur.key === k ? 'desc' : (k === 'name' || k === 'status' ? 'asc' : 'desc')) }; render(); }));
  document.querySelectorAll('[data-pview]').forEach(x => x.addEventListener('click', () => { S.projView = x.dataset.pview; render(); }));
  if(S.projQFocus){ const qq = el('proj-q'); if(qq){ qq.focus(); qq.setSelectionRange(qq.value.length, qq.value.length); } S.projQFocus = false; }
  document.querySelectorAll('[data-op]').forEach(x => x.addEventListener('click', () => { S.proj = +x.dataset.op; S.page = 'proj-d'; S.tab = 'estado'; render(); }));
  document.querySelectorAll('[data-oprov]').forEach(x => x.addEventListener('click', () => { S.prov = +x.dataset.oprov; S.page = 'prov-d'; S.tab = 'info'; render(); }));
  document.querySelectorAll('[data-oo]').forEach(x => x.addEventListener('click', () => { S.order = x.dataset.oo; S.page = 'order-d'; render(); }));
  document.querySelectorAll('[data-oinv]').forEach(x => x.addEventListener('click', () => { S.inv = decodeURIComponent(x.dataset.oinv); S.page = 'inv-d'; render(); }));

  // ── Fotos: completar miniaturas con URL firmada (bucket privado) ──
  document.querySelectorAll('img[data-photo]').forEach(async img => { const u = await signedUrl(img.dataset.photo); if(u) img.src = u; });
  document.querySelectorAll('video[data-vfile]').forEach(async vd => { const u = await signedUrl(vd.dataset.vfile); if(u) vd.src = u; });
  document.querySelectorAll('video[data-hls]').forEach(vd => { const url = vd.dataset.hls; if(window.Hls && window.Hls.isSupported()){ const h = new window.Hls(); h.loadSource(url); h.attachMedia(vd); hlsList.push(h); } else if(vd.canPlayType('application/vnd.apple.mpegurl')){ vd.src = url; } });
  document.querySelectorAll('img[data-snap]').forEach(img => { const base = img.dataset.snap; camTimers.push(setInterval(() => { img.src = base + (base.includes('?') ? '&' : '?') + 't=' + Date.now(); }, 5000)); });

  // ── Orden: avanzar estado ──
  document.querySelectorAll('[data-adv]').forEach(x => x.addEventListener('click', () => {
    const prov = D.providers.find(p => p.id === S.prov); const o = prov && prov.orders.find(z => z.id === x.dataset.adv); if(!o) return;
    const i = OSTATUS.indexOf(o.status); if(i < OSTATUS.length - 1) run(() => db.advanceOrder(o.id, OSTATUS[i+1]));
  }));

  // ── Abrir modales (alta) ──
  const open = (id, modal, pre) => el(id)?.addEventListener('click', () => { S.editId = null; ui.pendingFile = null; ui.pendingFiles = []; if(pre) pre(); S.modal = modal; render(); });
  open('new-proj', 'new-proj'); open('edit-proj', 'edit-proj'); open('new-prov', 'new-prov');
  open('new-order', 'new-order', () => { S.mi = [{desc:'',qty:'',unit:'u',price:''}]; });
  open('new-inv', 'new-investor', () => { S.invName = ''; S.invProjId = null; }); open('new-investor', 'new-investor', () => { S.invName = ''; S.invProjId = null; });
  open('new-inv-proj', 'new-investor', () => { S.invName = ''; S.invProjId = S.proj; });
  open('new-exp', 'new-exp', () => { S.expProjId = null; }); open('new-liq', 'new-liquidacion', () => { S.expProjId = null; });
  open('new-exp-proj', 'new-exp', () => { S.expProjId = S.proj; }); open('new-liq-proj', 'new-liquidacion', () => { S.expProjId = S.proj; }); open('new-receipt', 'new-receipt'); open('new-inv-doc', 'new-inv-doc');
  open('new-update', 'new-update'); open('new-plan', 'new-plan');
  open('new-budget', 'new-budget', () => { S.bdCtx = 'provider'; });
  open('new-budget-proj', 'new-budget', () => { S.bdCtx = 'project'; });
  open('new-media-link','new-media-link'); open('new-media-img','new-media-img'); open('new-media-vid','new-media-vid'); open('new-camera','new-camera');
  document.querySelectorAll('[data-addapt]').forEach(x => x.addEventListener('click', () => { S.editId = null; S.invProjId = null; S.invName = decodeURIComponent(x.dataset.addapt); S.modal = 'new-investor'; render(); }));
  document.querySelectorAll('[data-revopen]').forEach(x => x.addEventListener('click', () => { S.revCat = decodeURIComponent(x.dataset.revcat); S.revName = decodeURIComponent(x.dataset.revname); ui.pendingFile = null; S.modal = 'new-revision'; render(); }));

  // ── Abrir modales (edición) ──
  document.querySelectorAll('[data-eedit]').forEach(x => x.addEventListener('click', () => { S.editId = x.dataset.eedit; ui.pendingFile = null; S.modal = 'new-exp'; render(); }));
  document.querySelectorAll('[data-ledit]').forEach(x => x.addEventListener('click', () => { S.editId = x.dataset.ledit; S.modal = 'new-liquidacion'; render(); }));
  document.querySelectorAll('[data-iedit]').forEach(x => x.addEventListener('click', () => { S.editId = x.dataset.iedit; S.modal = 'new-investor'; render(); }));
  document.querySelectorAll('[data-bdedit]').forEach(x => x.addEventListener('click', () => { S.editId = x.dataset.bdedit; ui.pendingFile = null; S.modal = 'new-budget'; render(); }));
  el('edit-prov')?.addEventListener('click', () => { S.editId = S.prov; S.modal = 'new-prov'; render(); });

  // ── Cerrar modal ──
  document.querySelectorAll('#close-modal').forEach(x => x.addEventListener('click', closeModal));
  document.querySelector('.modal-overlay')?.addEventListener('click', e => { if(e.target.classList.contains('modal-overlay')) closeModal(); });

  // ── Zonas de carga ──
  wireDrop('rc-drop','rc-file',false); wireDrop('id-drop','id-file',false); wireDrop('ex-drop','ex-file',false);
  wireDrop('bd-drop','bd-file',false); wireDrop('pr-drop','pr-file',false);
  wireDrop('pl-drop','pl-file',true);  wireDrop('nu-drop','nu-file',true);
  wireDrop('mi-drop','mi-file',true);  wireDrop('mv-drop','mv-file',false);

  // ── Guardar: proyecto ──
  el('save-proj')?.addEventListener('click', () => {
    const name = v('np-name'), addr = v('np-addr'); if(!name || !addr){ toast('Completá nombre y dirección'); return; }
    const base = { name, address:addr, status:v('np-status')||'planificacion', progress:Math.min(100,Math.max(0,nv('np-prog'))), startDate:v('np-start'), endDate:v('np-end'), salePrice:nv('np-sale'), budget:nv('np-budget'), description:v('np-desc') };
    if(S.modal === 'edit-proj'){ const cur = D.projects.find(x => x.id === S.proj) || {}; const id = S.proj; S.modal = null; run(() => db.updateProject(id, { ...base, updates:cur.updates||[], model3d:cur.model3d, streamUrl:cur.streamUrl }), 'Proyecto actualizado'); }
    else { S.modal = null; run(() => db.addProject({ ...base, updates:[], model3d:null, streamUrl:null }), 'Proyecto creado'); }
  });

  // ── Guardar: proveedor ──
  el('save-prov')?.addEventListener('click', () => {
    const name = v('nv-name'), rubro = v('nv-rubro'); if(!name || !rubro){ toast('Completá empresa y rubro'); return; }
    const obj = { name, rubro, kind:v('nv-kind')||'materiales', contact:v('nv-contact'), phone:v('nv-phone'), email:v('nv-email') };
    const editId = S.editId; S.modal = null; S.editId = null;
    if(editId) run(() => db.updateProvider(editId, obj), 'Proveedor actualizado'); else run(() => db.addProvider(obj), 'Proveedor creado');
  });

  // ── Guardar: orden ──
  el('save-order')?.addEventListener('click', () => {
    const items = S.mi.filter(i => i.desc.trim()).map(i => { const qty = Number(i.qty)||0, price = Number(i.price)||0; return { desc:i.desc.trim(), qty, unit:i.unit, unitPrice:price, total:qty*price }; });
    if(!items.length){ toast('Agregá al menos un ítem con descripción'); return; }
    const obj = { id:v('no-num')||nextOrderNo(), date:v('no-date')||today(), ...pidOf(v('no-project')), items }, prov = S.prov; S.modal = null; run(() => db.addOrder(prov, obj), 'Orden creada');
  });

  // ── Guardar: aporte (alta o edición) ──
  el('save-investor')?.addEventListener('click', () => {
    const name = v('ni-name'); if(!name){ toast('Falta el nombre del inversor'); return; }
    if(!nv('ni-amount')){ toast('Ingresá el monto'); return; }
    const money = curOf('ni'); if(!money) return;
    const obj = { investor:name, ...pidOf(v('ni-project')), amount:nv('ni-amount'), ...money, pct:nv('ni-pct'), date:v('ni-date')||today(), note:v('ni-note') };
    const editId = S.editId; S.modal = null; S.editId = null;
    if(editId){ if(S.page === 'inv-d') S.inv = name; run(() => db.updateInvestment(editId, obj), 'Aporte actualizado'); }
    else run(() => db.addInvestment(obj), 'Aporte registrado');
  });

  // ── Guardar: gasto (alta o edición, ajusta el "gastado" del proyecto) ──
  el('save-exp')?.addEventListener('click', () => {
    const concept = v('ne-concept'); if(!concept){ toast('Falta el concepto'); return; }
    const amount = nv('ne-amount'); if(!amount){ toast('Ingresá el monto'); return; }
    const money = curOf('ne'); if(!money) return;
    const pv = D.providers.find(x => x.id == v('ne-provider'));
    const obj = { concept, category:v('ne-cat')||'otros', amount, ...money, budgetId:+v('ne-budget')||null, date:v('ne-date')||today(), providerId:pv?pv.id:null, provider:pv?pv.name:'-', ...pidOf(v('ne-project')) };
    const f = ui.pendingFile, cur = S.editId ? D.expenses.find(x => x.id == S.editId) : null;
    S.modal = null; S.editId = null; ui.pendingFile = null;
    if(cur) run(() => db.updateExpense(cur.id, { ...obj, mime:cur.mime }, f, cur.fileId), 'Gasto actualizado');
    else run(() => db.addExpense(obj, f), 'Gasto registrado');
  });

  // ── Guardar: liquidación (alta o edición) ──
  el('save-liq')?.addEventListener('click', () => {
    const pv = D.providers.find(x => x.id == v('nl-prov')); if(!pv){ toast('Elegí el proveedor / profesional que cobra'); return; }
    const amount = nv('nl-amount'); if(!amount){ toast('Ingresá el monto'); return; }
    const money = curOf('nl'); if(!money) return;
    const obj = { providerId:pv.id, worker:pv.name, trade:pv.rubro||pv.kind||'', amount, ...money, budgetId:+v('nl-budget')||null, date:v('nl-date')||today(), ...pidOf(v('nl-project')), note:v('nl-note') };
    const editId = S.editId; S.modal = null; S.editId = null;
    if(editId) run(() => db.updateLiquidacion(editId, obj), 'Liquidación actualizada');
    else run(() => db.addLiquidacion(obj), 'Liquidación registrada');
  });

  // ── Guardar: comprobante / documento / presupuesto ──
  el('save-receipt')?.addEventListener('click', () => {
    const f = ui.pendingFile; if(!f){ toast('Elegí un archivo'); return; }
    const meta = { name:f.name, mime:f.type, amount:nv('rc-amount'), date:v('rc-date')||today(), ...pidOf(v('rc-project')), orderId:v('rc-order'), note:v('rc-note') }, prov = S.prov;
    ui.pendingFile = null; S.modal = null; run(() => db.addReceipt(prov, meta, f), 'Comprobante cargado');
  });
  el('save-inv-doc')?.addEventListener('click', () => {
    const f = ui.pendingFile; if(!f){ toast('Elegí un archivo'); return; }
    const meta = { investor:S.inv, name:f.name, mime:f.type, kind:v('id-kind'), date:v('id-date')||today(), note:v('id-note') };
    ui.pendingFile = null; S.modal = null; run(() => db.addInvestorDoc(meta, f), 'Documento guardado');
  });
  el('save-budget')?.addEventListener('click', () => {
    const concept = v('bd-concept'); if(!concept){ toast('Falta el concepto'); return; }
    const amount = nv('bd-amount'); if(!amount){ toast('Ingresá el monto'); return; }
    const f = ui.pendingFile, editId = S.editId, fromProj = S.bdCtx === 'project';
    let prov = S.prov, projInfo;
    if(fromProj){ prov = +v('bd-prov') || null; if(!prov){ toast('Elegí el proveedor'); return; } projInfo = pidOf(S.proj); }
    else projInfo = pidOf(v('bd-project'));
    const pv = D.providers.find(p => p.id === prov); const cur = (!fromProj && editId) ? ((pv&&pv.budgets)||[]).find(b => b.id == editId) : null;
    const money = curOf('bd', false); if(!money) return;
    const meta = { concept, name:f ? f.name : (cur ? cur.name : concept), amount, ...money, ...projInfo, date:v('bd-date')||today(), note:v('bd-note') };
    ui.pendingFile = null; S.modal = null; S.editId = null;
    if(cur) run(() => db.updateBudget(cur.id, { ...meta, mime:cur.mime }, f, cur.fileId), 'Presupuesto actualizado');
    else run(() => db.addBudget(prov, meta, f), 'Presupuesto cargado');
  });
  const findBudget = id => { for(const pv of D.providers){ const b = (pv.budgets||[]).find(z => z.id == id); if(b) return b; } return null; };
  const choose = id => { const b = findBudget(id); run(() => db.chooseBudget(id, b ? b.projectId : null, b ? b.concept : null), 'Presupuesto elegido'); };
  document.querySelectorAll('[data-bdapprove]').forEach(x => x.addEventListener('click', () => choose(x.dataset.bdapprove)));
  document.querySelectorAll('[data-bdchoose]').forEach(x => x.addEventListener('click', () => choose(x.dataset.bdchoose)));
  document.querySelectorAll('[data-bdunchoose]').forEach(x => x.addEventListener('click', () => run(() => db.setBudgetStatus(x.dataset.bdunchoose, 'pendiente'), 'Presupuesto devuelto a pendientes')));
  document.querySelectorAll('[data-bdreject]').forEach(x => x.addEventListener('click', () => run(() => db.setBudgetStatus(x.dataset.bdreject, 'rechazado'), 'Presupuesto rechazado')));
  document.querySelectorAll('[data-bddel]').forEach(x => x.addEventListener('click', () => { if(!confirm('¿Eliminar este presupuesto?')) return; run(() => db.deleteBudget(x.dataset.bddel, x.dataset.rfile || null), 'Presupuesto eliminado'); }));

  // ── Guardar: actualización de obra (+ % + fotos) ──
  el('save-update')?.addEventListener('click', () => {
    const text = v('nu-text'); if(!text){ toast('Escribí el detalle de la actualización'); return; }
    const progress = Math.min(100, Math.max(0, nv('nu-prog')));
    const p = D.projects.find(x => x.id === S.proj), files = ui.pendingFiles || [], id = S.proj;
    const upd = { date:v('nu-date')||today(), text, progress };
    ui.pendingFiles = []; S.modal = null;
    run(() => db.addProjectUpdate(id, (p && p.updates) || [], upd, files, progress), files.length ? 'Actualización y fotos guardadas' : 'Actualización agregada');
  });

  // ── Guardar: multimedia (links / imágenes / video) y cámaras ──
  el('save-media-link')?.addEventListener('click', () => {
    const url = v('ml-url'); if(!/^https?:\/\//i.test(url)){ toast('Pegá una URL válida (https://...)'); return; }
    const meta = { title:v('ml-title') || url, url, note:v('ml-note'), uploadedBy:(S.user&&S.user.name)||'', date:today() }, proj = S.proj;
    S.modal = null; run(() => db.addMediaLink(proj, meta), 'Link agregado');
  });
  el('save-media-img')?.addEventListener('click', () => {
    const files = ui.pendingFiles||[]; if(!files.length){ toast('Elegí al menos una imagen'); return; }
    const meta = { note:v('mi-note'), uploadedBy:(S.user&&S.user.name)||'', date:today() }, proj = S.proj;
    ui.pendingFiles = []; S.modal = null; run(() => db.addMediaFiles(proj, 'image', meta, files), files.length>1 ? files.length+' imágenes subidas' : 'Imagen subida');
  });
  el('save-media-vid')?.addEventListener('click', () => {
    const f = ui.pendingFile; if(!f){ toast('Elegí un video'); return; }
    const meta = { title:v('mv-title') || f.name.replace(/\.[^.]+$/,''), note:v('mv-note'), uploadedBy:(S.user&&S.user.name)||'', date:today() }, proj = S.proj;
    ui.pendingFile = null; S.modal = null; run(() => db.addMediaFiles(proj, 'video', meta, [f]), 'Video subido');
  });
  document.querySelectorAll('[data-mdel]').forEach(x => x.addEventListener('click', () => { if(!confirm('¿Eliminar este elemento?')) return; run(() => db.deleteMedia(x.dataset.mdel, x.dataset.rfile || null), 'Eliminado'); }));
  el('save-camera')?.addEventListener('click', () => {
    const url = v('cm-url'); if(!/^https?:\/\//i.test(url)){ toast('Pegá una URL válida'); return; }
    const obj = { name:v('cm-name') || 'Cámara', url, type:v('cm-type') || 'auto' }, proj = S.proj;
    S.modal = null; run(() => db.addCamera(proj, obj), 'Cámara agregada');
  });
  document.querySelectorAll('[data-cmdel]').forEach(x => x.addEventListener('click', () => { if(!confirm('¿Quitar esta cámara?')) return; run(() => db.deleteCamera(x.dataset.cmdel), 'Cámara quitada'); }));

  // ── Guardar: planos / revisiones ──
  el('save-plan')?.addEventListener('click', () => {
    const files = ui.pendingFiles || []; if(!files.length){ toast('Elegí al menos un archivo'); return; }
    const meta = { category:v('pl-cat'), date:v('pl-date')||today(), note:v('pl-note'), uploadedBy:(S.user && S.user.name) || '' }, proj = S.proj;
    ui.pendingFiles = []; S.modal = null; run(() => db.addPlans(proj, meta, files), files.length > 1 ? files.length + ' planos subidos' : 'Plano subido');
  });
  el('save-revision')?.addEventListener('click', () => {
    const f = ui.pendingFile; if(!f){ toast('Elegí un archivo'); return; }
    const meta = { category:S.revCat, name:S.revName, date:v('pr-date')||today(), note:v('pr-note'), uploadedBy:(S.user && S.user.name) || '' }, proj = S.proj;
    ui.pendingFile = null; S.modal = null; run(() => db.addRevision(proj, meta, f), 'Revisión cargada');
  });
  document.querySelectorAll('[data-plapprove]').forEach(x => x.addEventListener('click', () => run(() => db.setPlanStatus(x.dataset.plapprove, 'aprobado'), 'Plano aprobado')));
  document.querySelectorAll('[data-pldel]').forEach(x => x.addEventListener('click', () => { if(!confirm('¿Eliminar este plano / revisión?')) return; run(() => db.deletePlan(x.dataset.pldel, x.dataset.rfile), 'Plano eliminado'); }));

  // ── Ítems del modal de orden (solo estado local) ──
  el('add-item')?.addEventListener('click', () => { S.mi.push({desc:'',qty:'',unit:'u',price:''}); render(); });
  document.querySelectorAll('[data-rm]').forEach(x => x.addEventListener('click', () => { S.mi.splice(+x.dataset.rm, 1); if(!S.mi.length) S.mi = [{desc:'',qty:'',unit:'u',price:''}]; render(); }));
  const updTotal = () => { const t = S.mi.reduce((a,i)=>a+(Number(i.qty)||0)*(Number(i.price)||0),0); const e = el('mtotal'); if(e) e.textContent = '$' + Math.round(t).toLocaleString('es-AR'); };
  document.querySelectorAll('.idesc').forEach(x => x.addEventListener('input', e => { S.mi[+e.target.dataset.idx].desc = e.target.value; }));
  document.querySelectorAll('.iqty').forEach(x => x.addEventListener('input', e => { S.mi[+e.target.dataset.idx].qty = e.target.value; updTotal(); }));
  document.querySelectorAll('.iunit').forEach(x => x.addEventListener('change', e => { S.mi[+e.target.dataset.idx].unit = e.target.value; }));
  document.querySelectorAll('.iprice').forEach(x => x.addEventListener('input', e => { S.mi[+e.target.dataset.idx].price = e.target.value; updTotal(); }));

  // ── Ver / descargar ──
  document.querySelectorAll('[data-rview]').forEach(x => x.addEventListener('click', () => viewFile(x.dataset.rview)));
  document.querySelectorAll('[data-rdl]').forEach(x => x.addEventListener('click', () => dlFile(x.dataset.rdl, x.dataset.rname)));

  // ── Eliminar ──
  document.querySelectorAll('[data-rdel]').forEach(x => x.addEventListener('click', () => { if(!confirm('¿Eliminar este comprobante?')) return; run(() => db.deleteReceipt(x.dataset.rdel, x.dataset.rfile), 'Comprobante eliminado'); }));
  document.querySelectorAll('[data-ddel]').forEach(x => x.addEventListener('click', () => { if(!confirm('¿Eliminar este documento?')) return; run(() => db.deleteInvestorDoc(x.dataset.ddel, x.dataset.rfile), 'Documento eliminado'); }));
  document.querySelectorAll('[data-idel]').forEach(x => x.addEventListener('click', () => { if(!confirm('¿Eliminar este aporte?')) return; run(() => db.deleteInvestment(x.dataset.idel), 'Aporte eliminado'); }));
  document.querySelectorAll('[data-edel]').forEach(x => x.addEventListener('click', () => { if(!confirm('¿Eliminar este gasto?')) return; run(() => db.deleteExpense(x.dataset.edel, x.dataset.efile || null), 'Gasto eliminado'); }));
  document.querySelectorAll('[data-ldel]').forEach(x => x.addEventListener('click', () => { if(!confirm('¿Eliminar esta liquidación?')) return; run(() => db.deleteLiquidacion(x.dataset.ldel), 'Liquidación eliminada'); }));
  document.querySelectorAll('[data-updel]').forEach(x => x.addEventListener('click', () => {
    const p = D.projects.find(z => z.id === S.proj); const idx = +x.dataset.updel;
    const gone = (p.updates||[])[idx]; const paths = ((gone && gone.photos) || []).map(ph => ph.path);
    const updates = (p.updates||[]).filter((_, i) => i !== idx);
    run(() => db.setProjectUpdates(S.proj, updates, paths));
  }));
  document.querySelectorAll('[data-delproj]').forEach(x => x.addEventListener('click', () => {
    const p = D.projects.find(z => z.id == x.dataset.delproj);
    if(!confirm('¿Eliminar el proyecto "' + p.name + '"? Se quitarán también sus gastos, liquidaciones, inversiones y planos.')) return;
    S.page = 'proyectos'; run(() => db.deleteProject(p.id), 'Proyecto eliminado');
  }));
  document.querySelectorAll('[data-delprov]').forEach(x => x.addEventListener('click', () => {
    const p = D.providers.find(z => z.id == x.dataset.delprov);
    if(!confirm('¿Eliminar el proveedor "' + p.name + '"?')) return;
    const paths = [...(p.receipts||[]).map(r => r.fileId), ...(p.budgets||[]).map(b => b.fileId)].filter(Boolean);
    S.page = 'proveedores'; run(() => db.deleteProvider(p.id, paths), 'Proveedor eliminado');
  }));
}
