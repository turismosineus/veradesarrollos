// Estructura general de la app logueada: sidebar + área principal.
// rPage decide qué vista renderizar según S.page (y protege las páginas de director).
import { S } from '../state.js';
import { isDirector, roleLabel } from '../utils.js';
import { rProyectos, rProjD } from './projects.js';
import { rProveedores, rProvD, rOrderD } from './providers.js';
import { rInversores, rInvD } from './investors.js';
import { rFinanzas } from './finance.js';
import { rModal } from './modals.js';

function rPage(){
  const dir = isDirector();
  const dirOnly = ['proveedores','prov-d','order-d','finanzas','inversores','inv-d'];
  if(dirOnly.includes(S.page) && !dir) return rProyectos();
  if(S.page==='proyectos')   return rProyectos();
  if(S.page==='proj-d')      return rProjD();
  if(S.page==='proveedores') return rProveedores();
  if(S.page==='prov-d')      return rProvD();
  if(S.page==='order-d')     return rOrderD();
  if(S.page==='inversores')  return rInversores();
  if(S.page==='inv-d')       return rInvD();
  if(S.page==='finanzas')    return rFinanzas();
  return rProyectos();
}

export function rApp(){
  const u = S.user, dir = isDirector();
  return `<div class="app">
    <button class="mob-menu" id="mob-menu" title="Menú"><i class="ti ti-menu-2"></i></button>
    <div class="sb-backdrop" id="sb-backdrop"></div>
    <div class="sidebar">
      <div class="sb-logo"><div class="sb-brand">VERA <span>DESARROLLOS</span></div><div class="sb-tagline">Sistema de gestión</div></div>
      <div class="nav-section">
        <div class="nav-label">Módulos</div>
        <div class="nav-item ${['proyectos','proj-d'].includes(S.page)?'active':''}" data-nav="proyectos"><i class="ti ti-building"></i> Proyectos</div>
        ${dir?`
        <div class="nav-item ${['proveedores','prov-d','order-d'].includes(S.page)?'active':''}" data-nav="proveedores"><i class="ti ti-truck"></i> Proveedores</div>
        <div class="nav-item ${['inversores','inv-d'].includes(S.page)?'active':''}" data-nav="inversores"><i class="ti ti-users"></i> Inversores</div>
        <div class="nav-item ${S.page==='finanzas'?'active':''}" data-nav="finanzas"><i class="ti ti-report-money"></i> Finanzas</div>`:''}
      </div>
      <div class="sb-footer">
        <div class="avatar">${u.name.split(' ').map(x=>x[0]).slice(0,2).join('')}</div>
        <div><div class="uname">${u.name.replace(/[<>&]/g,'')}</div><div class="urole">${roleLabel(u.role)}</div></div>
        <button class="logout-btn" id="logout" title="Cerrar sesión"><i class="ti ti-logout"></i></button>
      </div>
    </div>
    <div class="main">${rPage()}</div>
  </div>${S.modal?rModal():''}`;
}
