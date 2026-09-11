# Vera Desarrollos — Sistema de Gestión

App web de gestión de obra (proyectos, proveedores, comprobantes, inversores y finanzas).
JavaScript puro, **sin paso de compilación** (módulos nativos del navegador). Datos y
archivos en **Supabase** (base compartida + login real).

## Estructura

```
vera/
├── index.html          → Shell: carga el CSS y el módulo de entrada
├── css/styles.css      → Estilos
├── js/
│   ├── main.js         → Punto de entrada
│   ├── app.js          → render() + eventos (llama a db.* y auth.*)
│   ├── supabase.js     → Conexión (Project URL + clave pública)
│   ├── auth.js         → Login / sesión (Supabase Auth)
│   ├── db.js           → Lectura/escritura de datos en Supabase
│   ├── files.js        → Subir/ver/descargar archivos (Supabase Storage)
│   ├── state.js        → Estado en memoria (D = datos, S = interfaz)
│   ├── constants.js    → Constantes
│   ├── utils.js        → Helpers (formato, roles, toast...)
│   └── views/          → Una vista por pantalla (login, proyectos, proveedores,
│                          inversores, finanzas, modales, shell)
└── supabase/
    ├── schema.sql      → Tablas (correr 1°)
    ├── auth_setup.sql  → Perfiles + roles + trigger (correr 2°)
    ├── policies.sql    → Reglas de acceso a datos y archivos (correr 3°)
    └── seed.sql        → Datos de ejemplo (OPCIONAL)
```

## Puesta en marcha en Supabase (una vez)

1. SQL Editor → correr `schema.sql`.
2. SQL Editor → correr `auth_setup.sql`.
3. SQL Editor → correr `policies.sql`.
4. Storage → crear un bucket **privado** llamado `archivos`.
5. Authentication → Users → crear usuarios (marcar "Auto Confirm User").
6. Table Editor → tabla `profiles` → poner en `role`: `director`, `administrador` o `inversor`
   (a los inversores, cargarles el nombre del proyecto en `project`).
7. (Opcional) correr `seed.sql` si querés datos de ejemplo.

## Roles

- `director` y `administrador`: acceso completo.
- `inversor`: solo ve su proyecto.

## Probar en la compu

Usa módulos, así que **no** funciona abriendo el index.html con doble clic. Usá un
servidor local: VS Code + *Live Server*, o `npx serve`, o `python -m http.server`.

## Publicar en Netlify

Subí toda la carpeta `vera/` (Deploys → arrastrar). No hace falta build command.
