// Capa de acceso a datos: todo lo que lee/escribe en Supabase pasa por acá.
import { supabase } from './supabase.js';
import { D } from './state.js';
import { uploadFile, removeFile } from './files.js';

const d = x => x || null;
const num = x => Number(x) || 0;
const clamp = x => Math.min(100, Math.max(0, num(x)));

const mapProject = r => ({ id:r.id, name:r.name, address:r.address, status:r.status, progress:r.progress, startDate:r.start_date, endDate:r.end_date, salePrice:num(r.sale_price), budget:num(r.budget), spent:num(r.spent), description:r.description, updates:r.updates||[], plans:[], media:[], cameras:[], model3d:r.model3d, streamUrl:r.stream_url });
const projectRow = o => ({ name:o.name, address:o.address, status:o.status, progress:o.progress, start_date:d(o.startDate), end_date:d(o.endDate), sale_price:num(o.salePrice), budget:num(o.budget), spent:num(o.spent), description:o.description, updates:o.updates||[], model3d:o.model3d||null, stream_url:o.streamUrl||null });
const mapOrder   = r => ({ id:r.id, providerId:r.provider_id, project:r.project, status:r.status, items:r.items||[], date:r.date });
const mapReceipt = r => ({ id:r.id, name:r.name, fileId:r.file_path, mime:r.mime, amount:num(r.amount), date:r.date, project:r.project, orderId:r.order_id, note:r.note });
const mapBudget  = b => ({ id:b.id, providerId:b.provider_id, name:b.name, concept:b.concept, fileId:b.file_path, mime:b.mime, amount:num(b.amount), date:b.date, project:b.project, status:b.status||'pendiente', note:b.note });
const mapDoc     = r => ({ id:r.id, investor:r.investor, name:r.name, fileId:r.file_path, mime:r.mime, kind:r.kind, date:r.date, note:r.note });
const mapExpense = e => ({ id:e.id, concept:e.concept, category:e.category, amount:num(e.amount), date:e.date, provider:e.provider, project:e.project, fileId:e.file_path, mime:e.mime });
const mapLiq     = l => ({ id:l.id, providerId:l.provider_id, worker:l.worker, trade:l.trade, amount:num(l.amount), date:l.date, project:l.project, note:l.note });
const mapMedia   = m => ({ id:m.id, projectId:m.project_id, kind:m.kind, title:m.title, url:m.url, fileId:m.file_path, mime:m.mime, note:m.note, uploadedBy:m.uploaded_by, date:m.date });
const mapCamera  = c => ({ id:c.id, projectId:c.project_id, name:c.name, url:c.url, type:c.type||'auto' });
const mapPlan    = p => ({ id:p.id, projectId:p.project_id, category:p.category, name:p.name, revision:p.revision, status:p.status, current:p.current, uploadedBy:p.uploaded_by, fileId:p.file_path, mime:p.mime, date:p.date, note:p.note });

export async function loadAll(){
  const q = (t, o='id') => supabase.from(t).select('*').order(o);
  const [proj, prov, ord, exp, liq, inv, rec, docs, pln, bud, med, cam] = await Promise.all([
    q('projects'), q('providers'), q('orders','created_at'), q('expenses'), q('liquidaciones'),
    q('investments'), q('receipts'), q('investor_docs'), q('plans'), q('budgets'), q('media'), q('cameras')
  ]);
  for(const r of [proj, prov, ord, exp, liq, inv, rec, docs, pln, bud, med, cam]) if(r.error) throw r.error;
  D.projects      = (proj.data||[]).map(mapProject);
  D.providers     = (prov.data||[]).map(p => ({ id:p.id, name:p.name, rubro:p.rubro, contact:p.contact, phone:p.phone, email:p.email, kind:p.kind||'materiales', budgets:[], orders:[], receipts:[] }));
  D.expenses      = (exp.data||[]).map(mapExpense);
  D.liquidaciones = (liq.data||[]).map(mapLiq);
  D.investments   = (inv.data||[]).map(i => ({ id:i.id, investor:i.investor, project:i.project, amount:num(i.amount), pct:num(i.pct), date:i.date, note:i.note }));
  D.investorDocs  = (docs.data||[]).map(mapDoc);
  const provById = Object.fromEntries(D.providers.map(p => [p.id, p]));
  (ord.data||[]).forEach(o => { const p = provById[o.provider_id]; if(p) p.orders.push(mapOrder(o)); });
  (rec.data||[]).forEach(r => { const p = provById[r.provider_id]; if(p) p.receipts.push(mapReceipt(r)); });
  (bud.data||[]).forEach(b => { const p = provById[b.provider_id]; if(p) p.budgets.push(mapBudget(b)); });
  const projById = Object.fromEntries(D.projects.map(p => [p.id, p]));
  (pln.data||[]).forEach(r => { const p = projById[r.project_id]; if(p) p.plans.push(mapPlan(r)); });
  (med.data||[]).forEach(r => { const p = projById[r.project_id]; if(p) p.media.push(mapMedia(r)); });
  (cam.data||[]).forEach(r => { const p = projById[r.project_id]; if(p) p.cameras.push(mapCamera(r)); });
}

// ── Proyectos ──
export async function addProject(o){ const { error } = await supabase.from('projects').insert(projectRow(o)); if(error) throw error; }
export async function updateProject(id, o){ const { error } = await supabase.from('projects').update(projectRow(o)).eq('id', id); if(error) throw error; }
export async function bumpProjectSpent(id, spent){ const { error } = await supabase.from('projects').update({ spent:Math.max(0, num(spent)) }).eq('id', id); if(error) throw error; }
export async function setProjectUpdates(id, updates, removePaths){
  if(removePaths && removePaths.length) for(const p of removePaths) await removeFile(p);
  const { error } = await supabase.from('projects').update({ updates }).eq('id', id); if(error) throw error;
}
export async function saveProjectProgress(id, updates, progress){ const { error } = await supabase.from('projects').update({ updates, progress:clamp(progress) }).eq('id', id); if(error) throw error; }
// Nueva actualización con fotos: sube las fotos y guarda updates + % en un paso.
export async function addProjectUpdate(id, currentUpdates, upd, files, progress){
  const photos = [];
  for(const f of (files||[])){ const path = await uploadFile(f); photos.push({ path, name:f.name }); }
  const updates = [{ ...upd, photos }, ...(currentUpdates||[])];
  const { error } = await supabase.from('projects').update({ updates, progress:clamp(progress) }).eq('id', id);
  if(error){ for(const ph of photos) await removeFile(ph.path); throw error; }
}
export async function deleteProject(id, name){
  const { data: pr } = await supabase.from('projects').select('updates').eq('id', id).single();
  for(const u of ((pr && pr.updates) || [])) for(const ph of (u.photos||[])) await removeFile(ph.path);
  const { data: md } = await supabase.from('media').select('file_path').eq('project_id', id);
  if(md) for(const r of md) if(r.file_path) await removeFile(r.file_path);
  const { data: pls } = await supabase.from('plans').select('file_path').eq('project_id', id);
  if(pls) for(const r of pls) if(r.file_path) await removeFile(r.file_path);
  const { data: exs } = await supabase.from('expenses').select('file_path').eq('project', name);
  if(exs) for(const r of exs) if(r.file_path) await removeFile(r.file_path);
  await supabase.from('expenses').delete().eq('project', name);
  await supabase.from('liquidaciones').delete().eq('project', name);
  await supabase.from('investments').delete().eq('project', name);
  const { error } = await supabase.from('projects').delete().eq('id', id); if(error) throw error;
}

// ── Proveedores ──
export async function addProvider(o){ const { error } = await supabase.from('providers').insert({ name:o.name, rubro:o.rubro, contact:o.contact, phone:o.phone, email:o.email, kind:o.kind||'materiales' }); if(error) throw error; }
export async function updateProvider(id, o){ const { error } = await supabase.from('providers').update({ name:o.name, rubro:o.rubro, contact:o.contact, phone:o.phone, email:o.email, kind:o.kind||'materiales' }).eq('id', id); if(error) throw error; }
export async function deleteProvider(id, filePaths){
  for(const p of (filePaths||[])) await removeFile(p);
  const { error } = await supabase.from('providers').delete().eq('id', id); if(error) throw error;
}

// ── Órdenes ──
export async function addOrder(providerId, o){ const { error } = await supabase.from('orders').insert({ id:o.id, provider_id:providerId, project:d(o.project), date:d(o.date), status:'pendiente', items:o.items||[] }); if(error) throw error; }
export async function advanceOrder(id, status){ const { error } = await supabase.from('orders').update({ status }).eq('id', id); if(error) throw error; }

// ── Presupuestos de proveedor ──
export async function addBudget(providerId, meta, file){
  let path = null, mime = null;
  if(file){ path = await uploadFile(file); mime = file.type; }
  const { error } = await supabase.from('budgets').insert({ provider_id:providerId, name:meta.name, concept:meta.concept, file_path:path, mime, amount:num(meta.amount), date:d(meta.date), project:d(meta.project), status:'pendiente', note:meta.note });
  if(error){ if(path) await removeFile(path); throw error; }
}
export async function updateBudget(id, o, file, oldPath){
  let file_path = oldPath || null, mime = o.mime || null;
  if(file){ file_path = await uploadFile(file); mime = file.type; }
  const { error } = await supabase.from('budgets').update({ name:o.name, concept:o.concept, file_path, mime, amount:num(o.amount), date:d(o.date), project:d(o.project), note:o.note }).eq('id', id);
  if(error){ if(file && file_path) await removeFile(file_path); throw error; }
  if(file && oldPath) await removeFile(oldPath);
}
export async function setBudgetStatus(id, status){ const { error } = await supabase.from('budgets').update({ status }).eq('id', id); if(error) throw error; }
export async function deleteBudget(id, filePath){ const { error } = await supabase.from('budgets').delete().eq('id', id); if(error) throw error; if(filePath) await removeFile(filePath); }

// ── Gastos (compras) ──
export async function addExpense(o, file){
  let file_path = null, mime = null;
  if(file){ file_path = await uploadFile(file); mime = file.type; }
  const { error } = await supabase.from('expenses').insert({ concept:o.concept, category:o.category, amount:num(o.amount), date:d(o.date), provider:o.provider, project:o.project, file_path, mime });
  if(error){ if(file_path) await removeFile(file_path); throw error; }
}
export async function updateExpense(id, o, file, oldPath){
  let file_path = oldPath || null, mime = o.mime || null;
  if(file){ file_path = await uploadFile(file); mime = file.type; }
  const { error } = await supabase.from('expenses').update({ concept:o.concept, category:o.category, amount:num(o.amount), date:d(o.date), provider:o.provider, project:o.project, file_path, mime }).eq('id', id);
  if(error){ if(file && file_path) await removeFile(file_path); throw error; }
  if(file && oldPath) await removeFile(oldPath);
}
export async function deleteExpense(id, filePath){ const { error } = await supabase.from('expenses').delete().eq('id', id); if(error) throw error; if(filePath) await removeFile(filePath); }

// ── Liquidaciones ──
export async function addLiquidacion(o){ const { error } = await supabase.from('liquidaciones').insert({ provider_id:o.providerId||null, worker:o.worker, trade:o.trade, amount:num(o.amount), date:d(o.date), project:d(o.project), note:o.note }); if(error) throw error; }
export async function updateLiquidacion(id, o){ const { error } = await supabase.from('liquidaciones').update({ provider_id:o.providerId||null, worker:o.worker, trade:o.trade, amount:num(o.amount), date:d(o.date), project:d(o.project), note:o.note }).eq('id', id); if(error) throw error; }
export async function deleteLiquidacion(id){ const { error } = await supabase.from('liquidaciones').delete().eq('id', id); if(error) throw error; }

// ── Inversiones ──
export async function addInvestment(o){ const { error } = await supabase.from('investments').insert({ investor:o.investor, project:d(o.project), amount:num(o.amount), pct:num(o.pct), date:d(o.date), note:o.note }); if(error) throw error; }
export async function updateInvestment(id, o){ const { error } = await supabase.from('investments').update({ investor:o.investor, project:d(o.project), amount:num(o.amount), pct:num(o.pct), date:d(o.date), note:o.note }).eq('id', id); if(error) throw error; }
export async function deleteInvestment(id){ const { error } = await supabase.from('investments').delete().eq('id', id); if(error) throw error; }

// ── Comprobantes de proveedor ──
export async function addReceipt(providerId, meta, file){
  const path = await uploadFile(file);
  const { error } = await supabase.from('receipts').insert({ provider_id:providerId, name:meta.name, file_path:path, mime:meta.mime, amount:num(meta.amount), date:d(meta.date), project:d(meta.project), order_id:d(meta.orderId), note:meta.note });
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

// ── Planos (categorías + revisiones) ──
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

// ── Multimedia del proyecto (links 3D/video, imágenes, videos) ──
export async function addMediaLink(projectId, meta){ const { error } = await supabase.from('media').insert({ project_id:projectId, kind:'link', title:meta.title, url:meta.url, note:meta.note, uploaded_by:meta.uploadedBy, date:d(meta.date) }); if(error) throw error; }
export async function addMediaFiles(projectId, kind, meta, files){
  for(const f of files){
    const path = await uploadFile(f); const base = f.name.replace(/\.[^.]+$/, '');
    const { error } = await supabase.from('media').insert({ project_id:projectId, kind, title:meta.title || base, file_path:path, mime:f.type, note:meta.note, uploaded_by:meta.uploadedBy, date:d(meta.date) });
    if(error){ await removeFile(path); throw error; }
  }
}
export async function deleteMedia(id, filePath){ const { error } = await supabase.from('media').delete().eq('id', id); if(error) throw error; if(filePath) await removeFile(filePath); }

// ── Cámaras ──
export async function addCamera(projectId, o){ const { error } = await supabase.from('cameras').insert({ project_id:projectId, name:o.name, url:o.url, type:o.type }); if(error) throw error; }
export async function deleteCamera(id){ const { error } = await supabase.from('cameras').delete().eq('id', id); if(error) throw error; }
