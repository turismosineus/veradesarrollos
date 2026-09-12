// Utilidades compartidas: formato de moneda, escape de HTML, atajos al DOM,
// notificaciones (toast) y algunas agregaciones de datos.
import { S, D } from './state.js';

export const fmt = n => '$' + Math.round(n||0).toLocaleString('es-AR');
export const fmtK = n => { n = n||0; if(!n) return '$0'; return Math.abs(n) >= 1000000 ? '$'+(n/1000000).toFixed(1)+'M' : '$'+(n/1000).toFixed(0)+'K'; };
export const sBadge = s => ({
  construccion:'<span class="badge ba">En construcción</span>',
  planificacion:'<span class="badge bb">Planificación</span>',
  finalizado:'<span class="badge bg">Finalizado</span>',
  pausado:'<span class="badge bgr">Pausado</span>'
}[s] || '');
export const oTotal = o => o.items.reduce((a,i)=>a+i.total,0);
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export const el = id => document.getElementById(id);
export const v  = id => { const e = el(id); return e ? e.value.trim() : ''; };
export const nv = id => { const e = el(id); return e ? (parseFloat(e.value)||0) : 0; };
export const today = () => new Date().toISOString().slice(0,10);
// Acceso completo: director y administrador ven y editan todo. El inversor es limitado.
export const FULL_ACCESS_ROLES = ['director', 'administrador'];
export const isDirector = () => S.user && FULL_ACCESS_ROLES.includes(S.user.role);
export const roleLabel = r => r === 'administrador' ? 'Administrador' : (r === 'director' ? 'Director' : 'Inversor');

export function toast(msg){
  const h = el('toast-host'); if(!h) return;
  h.innerHTML = '<div class="toast"><i class="ti ti-check"></i>' + esc(msg) + '</div>';
  clearTimeout(window.__tt);
  window.__tt = setTimeout(() => h.innerHTML = '', 2200);
}

export function aggInvestors(){
  const map = {};
  D.investments.forEach(i => {
    if(!map[i.investor]) map[i.investor] = { name:i.investor, total:0, count:0, projects:new Set() };
    const m = map[i.investor]; m.total += i.amount; m.count++; m.projects.add(i.project);
  });
  return Object.values(map).sort((a,b) => b.total - a.total);
}

export function nextOrderNo(){
  let max = 0;
  D.providers.forEach(p => p.orders.forEach(o => { const m = /OC-(\d+)/.exec(o.id); if(m) max = Math.max(max, +m[1]); }));
  return 'OC-' + String(max+1).padStart(3,'0');
}

export const nextId = arr => (arr.length ? Math.max(...arr.map(x=>x.id||0)) : 0) + 1;
export const projOptions = selId => D.projects.map(p => '<option value="'+p.id+'" '+((selId!=null && p.id==selId)?'selected':'')+'>'+esc(p.name)+'</option>').join('');

// Convierte un link conocido en URL embebible (o null si no se puede embeber).
export function toEmbed(url){
  if(!url) return null; let m;
  if((m = url.match(/(?:youtube\.com\/(?:watch\?v=|live\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/))) return 'https://www.youtube.com/embed/' + m[1];
  if(/youtube\.com\/embed\//.test(url)) return url;
  if((m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/))) return 'https://player.vimeo.com/video/' + m[1];
  if((m = url.match(/sketchfab\.com\/(?:3d-models\/[^/]*-|models\/)([a-f0-9]{32})/))) return 'https://sketchfab.com/models/' + m[1] + '/embed';
  if(/matterport\.com\/show/.test(url)) return url;
  if(/kuula\.co\//.test(url)) return url;
  return null;
}
// Detecta cómo reproducir una cámara según su URL (salvo que se fuerce un tipo).
export function camType(url, forced){
  if(forced && forced !== 'auto') return forced;
  if(/youtu/.test(url||'')) return 'youtube';
  if(/\.m3u8(\?|$)/i.test(url||'')) return 'hls';
  if(/\.(jpe?g|png)(\?|$)/i.test(url||'') || /snapshot|cgi-bin|\/shot\.jpg/i.test(url||'')) return 'image';
  if(/\.(mp4|webm)(\?|$)/i.test(url||'')) return 'video';
  return 'iframe';
}
