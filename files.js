// Manejo de archivos con Supabase Storage (bucket privado "archivos").
import { supabase } from './supabase.js';
import { ui } from './state.js';
import { el, toast } from './utils.js';
const BUCKET = 'archivos';

export function onPickFile(input, prefix){
  ui.pendingFile = input.files[0] || null;
  const lbl = el(prefix + '-file-lbl'), box = el(prefix + '-drop');
  if(ui.pendingFile){ if(lbl) lbl.textContent = ui.pendingFile.name; if(box) box.classList.add('has'); }
}
export async function uploadFile(file){
  const safe = file.name.replace(/[^\w.\-]+/g, '_');
  const path = Date.now() + '_' + Math.random().toString(36).slice(2,7) + '_' + safe;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert:false });
  if(error) throw error;
  return path;
}
export async function removeFile(path){ if(!path) return; await supabase.storage.from(BUCKET).remove([path]); }
export async function signedUrl(path, secs = 3600){
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, secs);
  return (error || !data) ? null : data.signedUrl;
}
export async function viewFile(path){
  const u = await signedUrl(path, 60); if(!u){ toast('No pude abrir el archivo'); return; }
  window.open(u, '_blank');
}
export async function dlFile(path, name){
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60, { download: name || true });
  if(error || !data){ toast('No pude descargar el archivo'); return; }
  window.open(data.signedUrl, '_blank');
}
