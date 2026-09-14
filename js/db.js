// Capa de acceso a datos: todo lo que lee/escribe en Supabase pasa por acá.
// Regla de oro: los vínculos van por ID (project_id / provider_id); los textos
// (project, provider) se guardan solo como apoyo visual y se re-derivan al cargar.
import { supabase } from './supabase.js';
import { D } from './state.js';
import { uploadFile, removeFile } from './files.js';
import { usdOf } from './utils.js';

const d = x => x || null;
const num = x => Number(x) || 0;
const clamp = x => Math.min(100, Math.max(0, num(x)));

const mapProject = r => ({ id:r.id, createdAt:(r.created_at||'').slice(0,10), name:r.name, address:r.address, status:r.status, progress:r.progress, startDate:r.start_date, endDate:r.end_date, salePrice:num(r.sale_price), budget:num(r.budget), spent:0, description:r.description, updates:r.updates||[], plans:[], media:[], cameras:[], model3d:r.model3d, streamUrl:r.stream_url });
const projectRow = o => ({ name:o.name, address:o.address, status:o.status, progress:o.progress, start_date:d(o.startDate), end_date:d(o.endDate), sale_price:num(o.salePrice), budget:num(o.budget), description:o.description, updates:o.updates||[], model3d:o.model3d||null, stream_url:o.streamUrl||null });
const mapOrder   = r => ({ id:r.id, providerId:r.provider_id, projectId:r.project_id, project:r.project, status:r.status, items:r.items||[], date:r.date });
const mapReceipt = r => ({ id:r.id, name:r.name, fileId:r.file_path, mime:r.mime, amount:num(r.amount), date:r.date, projectId:r.project_id, project:r.project, orderId:r.order_id, note:r.note });
const mapBudget  = b => ({ id:b.id, providerId:b.provider_id, name:b.name, concept:b.concept, fileId:b.file_path, mime:b.mime, amount:num(b.amount), currency:b.currency||'ARS', rate:num(b.rate)||null, date:b.date, projectId:b.project_id, project:b.project, status:b.status||'pendiente', note:b.note });
const mapDoc     = r => ({ id:r.id, investor:r.investor, name:r.name, fileId:r.file_path, mime:r.mime, kind:r.kind, date:r.date, note:r.note });
const mapExpense = e => ({ id:e.id, budgetId:e.budget_id||null, concept:e.concept, category:e.category, amount:num(e.amount), currency:e.currency||'ARS', rate:num(e.rate)||null, date:e.date, providerId:e.provider_id, provider:e.provider, projectId:e.project_id, project:e.project, fileId:e.file_path, mime:e.mime });
const mapLiq     = l => ({ id:l.id, budgetId:l.budget_id||null, providerId:l.provider_id, worker:l.worker, trade:l.trade, amount:num(l.amount), currency:l.currency||'ARS', rate:num(l.rate)||null, date:l.date, projectId:l.project_id, project:l.project, note:l.note });
const mapInv     = i => ({ id:i.id, investor:i.investor, projectId:i.project_id, project:i.project, amount:num(i.amount), currency:i.currency||'USD', rate:num(i.rate)||null, pct:num(i.pct), date:i.date, note:i.note });
const mapPlan    = p => ({ id:p.id, projectId:p.project_id, category:p.category, name:p.name, revision:p.revision, status:p.status, current:p.current, uploadedBy:p.uploaded_by, fileId:p.file_path, mime:p.mime, date:p.date, note:p.note });
const mapMedia   = m => ({ id:m.id, projectId:m.project_id, kind:m.kind, title:m.title, url:m.url, fileId:m.file_path, mime:m.mime, note:m.note, uploadedBy:m.uploaded_by, date:m.date });
const mapCamera  = c => ({ id:c.id, projectId:c.project_id, name:c.name, url:c.url, type:c.type||'auto' });

export async function loadAll(){
  const q = (t, o='id') => supabase.from(t).select('*').order(o);
  const [proj, prov, ord, exp, liq, inv, rec, docs, pln, bud, med, cam, set] = await Promise.all([
    q('projects'), q('providers'), q('orders','created_at'), q('expenses'), q('liquidaciones'),
    q('investments'), q('receipts'), q('investor_docs'), q('plans'), q('budgets'), q('media'), q('cameras'), q('settings')
  ]);
  for(const r of [proj, prov, ord, exp, liq, inv, rec, docs, pln, bud, med, cam, set]) if(r.error) throw r.error;
  D.settings = { refRate: num((set.data||[])[0] && (set.data||[])[0].ref_rate) || null };

  D.projects  = (proj.data||[]).map(mapProject);
  D.providers = (prov.data||[]).map(p => ({ id:p.id, name:p.name, rubro:p.rubro, contact:p.contact, phone:p.phone, email:p.email, kind:p.kind||'materiales', budgets:[], orders:[], receipts:[] }));
  const projById = Object.fromEntries(D.projects.map(p => [p.id, p]));
  const provById = Object.fromEntries(D.providers.map(p => [p.id, p]));
  // Nombres derivados del ID (si hay ID); si no, el texto guardado.
  const pname = (id, txt) => (id != null && projById[id]) ? projById[id].name : (txt || '');
  const vname = (id, txt) => (id != null && provById[id]) ? provById[id].name : (txt || '-');

  const withUsd = x => ({ ...x, usd: usdOf(x) });
  D.expenses      = (exp.data||[]).map(mapExpense).map(e => withUsd({ ...e, project:pname(e.projectId, e.project), provider:vname(e.providerId, e.provider) }));
  D.liquidaciones = (liq.data||[]).map(mapLiq).map(l => withUsd({ ...l, project:pname(l.projectId, l.project), worker:vname(l.providerId, l.worker) }));
  D.investments   = (inv.data||[]).map(mapInv).map(i => withUsd({ ...i, project:pname(i.projectId, i.project) }));
  D.investorDocs  = (docs.data||[]).map(mapDoc);

  (ord.data||[]).forEach(o => { const p = provById[o.provider_id]; if(p) p.orders.push({ ...mapOrder(o), project:pname(o.project_id, o.project) }); });
  (rec.data||[]).forEach(r => { const p = provById[r.provider_id]; if(p) p.receipts.push({ ...mapReceipt(r), project:pname(r.project_id, r.project) }); });
  (bud.data||[]).forEach(b => { const p = provById[b.provider_id]; if(p) p.budgets.push(withUsd({ ...mapBudget(b), project:pname(b.project_id, b.project) })); });
  (pln.data||[]).forEach(r => { const p = projById[r.project_id]; if(p) p.plans.push(mapPlan(r)); });
  (med.data||[]).forEach(r => { const p = projById[r.project_id]; if(p) p.media.push(mapMedia(r)); });
  (cam.data||[]).forEach(r => { const p = projById[r.project_id]; if(p) p.cameras.push(mapCamera(r)); });

  // "Gastado" SIEMPRE calculado, en USD: gastos + liquidaciones del proyecto (solo los que tienen cotización).
  D.projects.forEach(p => {
    const movs = [...D.expenses.filter(e => e.projectId === p.id), ...D.liquidaciones.filter(x => x.projectId === p.id)];
    p.spent = movs.reduce((a,m)=>a+(m.usd||0),0);
    p.spentUnknown = movs.filter(m => m.usd == null).length;   // movimientos en ARS sin cotización
  });
}

// ── Proyectos ──
export async function addProject(o){ const { error } = await supabase.from('projects').insert(projectRow(o)); if(error) throw error; }
export async function updateProject(id, o){ const { error } = await supabase.from('projects').update(projectRow(o)).eq('id', id); if(error) throw error; }
export async function setProjectUpdates(id, updates, removePaths){
  if(removePaths && removePaths.length) for(const p of removePaths) await removeFile(p);
  const { error } = await supabase.from('projects').update({ updates }).eq('id', id); if(error) throw error;
}
export async function saveProjectProgress(id, updates, progress){ const { error } = await supabase.from('projects').update({ updates, progress:clamp(progress) }).eq('id', id); if(error) throw error; }
export async function addProjectUpdate(id, currentUpdates, upd, files, progress){
  const photos = [];
  for(const f of (files||[])){ const path = await uploadFile(f); photos.push({ path, name:f.name }); }
  const updates = [{ ...upd, photos }, ...(currentUpdates||[])];
  const { error } = await supabase.from('projects').update({ updates, progress:clamp(progress) }).eq('id', id);
  if(error){ for(const ph of photos) await removeFile(ph.path); throw error; }
}
export async function deleteProject(id){
  const { data: pr } = await supabase.from('projects').select('updates').eq('id', id).single();
  for(const u of ((pr && pr.updates) || [])) for(const ph of (u.photos||[])) await removeFile(ph.path);
  for(const t of ['plans','media','expenses']){ const { data } = await supabase.from(t).select('file_path').eq('project_id', id); if(data) for(const r of data) if(r.file_path) await removeFile(r.file_path); }
  const { error } = await supabase.from('projects').delete().eq('id', id); if(error) throw error; // el resto se borra en cascada
}

// ── Configuración ──
export async function setRefRate(rate){ const { error } = await supabase.from('settings').update({ ref_rate:num(rate), updated_at:new Date().toISOString() }).eq('id', 1); if(error) throw error; }

// ── Proveedores ──
export async function addProvider(o){ const { error } = await supabase.from('providers').insert({ name:o.name, rubro:o.rubro, contact:o.contact, phone:o.phone, email:o.email, kind:o.kind||'materiales' }); if(error) throw error; }
export async function updateProvider(id, o){ const { error } = await supabase.from('providers').update({ name:o.name, rubro:o.rubro, contact:o.contact, phone:o.phone, email:o.email, kind:o.kind||'materiales' }).eq('id', id); if(error) throw error; }
export async function deleteProvider(id, filePaths){
  for(const p of (filePaths||[])) await removeFile(p);
  const { error } = await supabase.from('providers').delete().eq('id', id); if(error) throw error;
}

// ── Órdenes ──
export async function addOrder(providerId, o){ const { error } = await supabase.from('orders').insert({ id:o.id, provider_id:providerId, project_id:o.projectId||null, project:d(o.project), date:d(o.date), status:'pendiente', items:o.items||[] }); if(error) throw error; }
export async function advanceOrder(id, status){ const { error } = await supabase.from('orders').update({ status }).eq('id', id); if(error) throw error; }

// ── Presupuestos ──
export async function addBudget(providerId, meta, file){
  let path = null, mime = null;
  if(file){ path = await uploadFile(file); mime = file.type; }
  const { error } = await supabase.from('budgets').insert({ provider_id:providerId, name:meta.name, concept:meta.concept, file_path:path, mime, amount:num(meta.amount), currency:meta.currency||'ARS', rate:meta.rate||null, date:d(meta.date), project_id:meta.projectId||null, project:d(meta.project), status:'pendiente', note:meta.note });
  if(error){ if(path) await removeFile(path); throw error; }
}
export async function updateBudget(id, o, file, oldPath){
  let file_path = oldPath || null, mime = o.mime || null;
  if(file){ file_path = await uploadFile(file); mime = file.type; }
  const { error } = await supabase.from('budgets').update({ name:o.name, concept:o.concept, file_path, mime, amount:num(o.amount), currency:o.currency||'ARS', rate:o.rate||null, date:d(o.date), project_id:o.projectId||null, project:d(o.project), note:o.note }).eq('id', id);
  if(error){ if(file && file_path) await removeFile(file_path); throw error; }
  if(file && oldPath) await removeFile(oldPath);
}
export async function chooseBudget(id, projectId, concept){
  const { error } = await supabase.from('budgets').update({ status:'aprobado' }).eq('id', id); if(error) throw error;
  if(projectId && concept){
    await supabase.from('budgets').update({ status:'rechazado' }).eq('project_id', projectId).eq('status', 'pendiente').ilike('concept', concept).neq('id', id);
  }
}
export async function setBudgetStatus(id, status){ const { error } = await supabase.from('budgets').update({ status }).eq('id', id); if(error) throw error; }
export async function deleteBudget(id, filePath){ const { error } = await supabase.from('budgets').delete().eq('id', id); if(error) throw error; if(filePath) await removeFile(filePath); }

// ── Gastos ──
const expenseRow = (o, file_path, mime) => ({ budget_id:o.budgetId||null, concept:o.concept, category:o.category, amount:num(o.amount), currency:o.currency||'ARS', rate:o.rate||null, date:d(o.date), provider_id:o.providerId||null, provider:o.provider||'-', project_id:o.projectId||null, project:d(o.project), file_path, mime });
export async function addExpense(o, file){
  let file_path = null, mime = null;
  if(file){ file_path = await uploadFile(file); mime = file.type; }
  const { error } = await supabase.from('expenses').insert(expenseRow(o, file_path, mime));
  if(error){ if(file_path) await removeFile(file_path); throw error; }
}
export async function updateExpense(id, o, file, oldPath){
  let file_path = oldPath || null, mime = o.mime || null;
  if(file){ file_path = await uploadFile(file); mime = file.type; }
  const { error } = await supabase.from('expenses').update(expenseRow(o, file_path, mime)).eq('id', id);
  if(error){ if(file && file_path) await removeFile(file_path); throw error; }
  if(file && oldPath) await removeFile(oldPath);
}
export async function deleteExpense(id, filePath){ const { error } = await supabase.from('expenses').delete().eq('id', id); if(error) throw error; if(filePath) await removeFile(filePath); }

// ── Liquidaciones ──
const liqRow = o => ({ budget_id:o.budgetId||null, provider_id:o.providerId||null, worker:o.worker, trade:o.trade, amount:num(o.amount), currency:o.currency||'ARS', rate:o.rate||null, date:d(o.date), project_id:o.projectId||null, project:d(o.project), note:o.note });
export async function addLiquidacion(o){ const { error } = await supabase.from('liquidaciones').insert(liqRow(o)); if(error) throw error; }
export async function updateLiquidacion(id, o){ const { error } = await supabase.from('liquidaciones').update(liqRow(o)).eq('id', id); if(error) throw error; }
export async function deleteLiquidacion(id){ const { error } = await supabase.from('liquidaciones').delete().eq('id', id); if(error) throw error; }

// ── Inversiones ──
const invRow = o => ({ investor:o.investor, project_id:o.projectId||null, project:d(o.project), amount:num(o.amount), currency:o.currency||'USD', rate:o.rate||null, pct:num(o.pct), date:d(o.date), note:o.note });
export async function addInvestment(o){ const { error } = await supabase.from('investments').insert(invRow(o)); if(error) throw error; }
export async function updateInvestment(id, o){ const { error } = await supabase.from('investments').update(invRow(o)).eq('id', id); if(error) throw error; }
export async function deleteInvestment(id){ const { error } = await supabase.from('investments').delete().eq('id', id); if(error) throw error; }

// ── Comprobantes ──
export async function addReceipt(providerId, meta, file){
  const path = await uploadFile(file);
  const { error } = await supabase.from('receipts').insert({ provider_id:providerId, name:meta.name, file_path:path, mime:meta.mime, amount:num(meta.amount), date:d(meta.date), project_id:meta.projectId||null, project:d(meta.project), order_id:d(meta.orderId), note:meta.note });
  if(error){ await removeFile(path); throw error; }
}
export async function deleteReceipt(id, filePath){ const { error } = await supabase.from('receipts').delete().eq('id', id); if(error) throw error; await removeFile(filePath); }

// ── Documentos de inversor ──
export async function addInvestorDoc(meta, file){
  const path = await uploadFile(file);
  const { error } = await supabase.from('investor_docs').insert({ investor:meta.investor, name:meta.name, file_path:path, mime:meta.mime, kind:meta.kind, date:d(meta.date), note:meta.note });
  if(error){ await removeFile(path); throw error; }
}
export async function deleteInvestorDoc(id, filePath){ const { error } = await supabase.from('investor_docs').delete().eq('id', id); if(error) throw error; await removeFile(filePath); }

// ── Planos ──
function nextRevision(existing){ let max = -1; (existing||[]).forEach(p => { const m = /R?(\d+)/i.exec(p.revision||''); if(m) max = Math.max(max, +m[1]); }); return 'R' + (max+1); }
export async function addPlans(projectId, meta, files){
  for(const f of files){
    const base = f.name.replace(/\.[^.]+$/, ''); const path = await uploadFile(f);
    const { error } = await supabase.from('plans').insert({ project_id:projectId, category:meta.category, name:base, revision:'R0', status:'en revisión', current:true, uploaded_by:meta.uploadedBy, file_path:path, mime:f.type, date:d(meta.date), note:meta.note });
    if(error){ await removeFile(path); throw error; }
  }
}
export async function addRevision(projectId, meta, file){
  const { data: ex, error: e1 } = await supabase.from('plans').select('id,revision').eq('project_id', projectId).eq('category', meta.category).eq('name', meta.name);
  if(e1) throw e1;
  const rev = nextRevision(ex); const path = await uploadFile(file);
  const { error } = await supabase.from('plans').insert({ project_id:projectId, category:meta.category, name:meta.name, revision:rev, status:'en revisión', current:true, uploaded_by:meta.uploadedBy, file_path:path, mime:file.type, date:d(meta.date), note:meta.note });
  if(error){ await removeFile(path); throw error; }
  const ids = (ex||[]).map(x => x.id); if(ids.length) await supabase.from('plans').update({ current:false, status:'obsoleto' }).in('id', ids);
}
export async function setPlanStatus(id, status){ const { error } = await supabase.from('plans').update({ status }).eq('id', id); if(error) throw error; }
export async function deletePlan(id, filePath){ const { error } = await supabase.from('plans').delete().eq('id', id); if(error) throw error; if(filePath) await removeFile(filePath); }

// ── Multimedia y cámaras ──
export async function addMediaLink(projectId, meta){ const { error } = await supabase.from('media').insert({ project_id:projectId, kind:'link', title:meta.title, url:meta.url, note:meta.note, uploaded_by:meta.uploadedBy, date:d(meta.date) }); if(error) throw error; }
export async function addMediaFiles(projectId, kind, meta, files){
  for(const f of files){
    const path = await uploadFile(f); const base = f.name.replace(/\.[^.]+$/, '');
    const { error } = await supabase.from('media').insert({ project_id:projectId, kind, title:meta.title || base, file_path:path, mime:f.type, note:meta.note, uploaded_by:meta.uploadedBy, date:d(meta.date) });
    if(error){ await removeFile(path); throw error; }
  }
}
export async function deleteMedia(id, filePath){ const { error } = await supabase.from('media').delete().eq('id', id); if(error) throw error; if(filePath) await removeFile(filePath); }
export async function addCamera(projectId, o){ const { error } = await supabase.from('cameras').insert({ project_id:projectId, name:o.name, url:o.url, type:o.type }); if(error) throw error; }
export async function deleteCamera(id){ const { error } = await supabase.from('cameras').delete().eq('id', id); if(error) throw error; }
