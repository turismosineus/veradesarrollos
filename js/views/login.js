// Pantalla de login (Supabase Auth: email + contraseña).
export function rLogin(){
  return `<div class="login-wrap"><div class="login-card">
    <div class="lbrand">VERA <span>DESARROLLOS</span></div>
    <div class="lsub">Sistema de gestión de proyectos</div>
    <div class="lf"><label>Email</label><input id="lu" type="email" placeholder="tu@email.com" autocomplete="username"></div>
    <div class="lf"><label>Contraseña</label><input id="lp" type="password" placeholder="••••••••" autocomplete="current-password"></div>
    <button class="lbtn" id="lbtn">Ingresar al sistema</button>
    <div id="lerr" class="lerr"></div>
    <div class="lhint">Ingresá con el email y la contraseña de tu cuenta.</div>
  </div></div>`;
}
