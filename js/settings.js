/* SPORTLY360° · js/settings.js — Pantalla de Configuración (perfil + sesión). */

var cfgUser = null;   /* auth user actual (cacheado mientras se está en la vista) */

async function irConfig() {
  enHome = false; renderSidebar();
  mostrar('settings-view');
  setCrumbs('settings', [{ label: 'Inicio', act: 'home' }, { label: 'Configuración' }]);
  document.getElementById('settings-view').innerHTML = skelPerfil();
  await cargarConfig();
}

async function cargarConfig() {
  var res = await sb.auth.getUser();
  cfgUser = (res.data && res.data.user) || null;
  var box = document.getElementById('settings-view');
  if (!box) return;
  if (!cfgUser) { box.innerHTML = emptyState('perfil', 'Inicia sesión', 'Necesitas iniciar sesión para ver tu configuración.'); return; }

  var m = cfgUser.user_metadata || {};
  var foto = m.avatar_url || m.picture || '';
  var perfil = {};
  var r = await sb.from('perfiles').select('*').eq('id', cfgUser.id).single();
  if (r.data) perfil = r.data;

  var nombreDef = perfil.nombre || (m.given_name || (m.full_name || m.name || '').split(' ')[0] || '');
  var apellidoDef = perfil.apellido || (m.family_name || (m.full_name || m.name || '').split(' ').slice(1).join(' ') || '');

  var avaHtml = foto
    ? '<img src="' + foto + '" alt="" class="cfg-ava">'
    : '<span class="cfg-ava cfg-ava-ph">' + (nombreDef.charAt(0) || 'J').toUpperCase() + '</span>';

  box.innerHTML =
    '<div class="cfg-head">' + avaHtml +
      '<div><div class="cfg-name">' + (nombreDef ? nombreDef + ' ' + apellidoDef : 'Tu perfil') + '</div>' +
      '<div class="cfg-email">' + (cfgUser.email || '') + '</div></div></div>' +

    '<div class="cfg-title">Datos personales</div>' +
    '<div class="cfg-grid">' +
      '<div class="cfg-field"><label>Nombre</label><input id="cfg-nombre" type="text" value="' + esc(nombreDef) + '"></div>' +
      '<div class="cfg-field"><label>Apellido</label><input id="cfg-apellido" type="text" value="' + esc(apellidoDef) + '"></div>' +
      '<div class="cfg-field"><label>Teléfono</label><input id="cfg-telefono" type="tel" value="' + esc(perfil.telefono || '') + '" placeholder="9 1234 5678"></div>' +
      '<div class="cfg-field"><label>RUT</label><input id="cfg-rut" type="text" value="' + esc(perfil.rut || '') + '" placeholder="12.345.678-9"></div>' +
      '<div class="cfg-field cfg-field-wide"><label>Correo</label><input type="email" value="' + esc(cfgUser.email || '') + '" disabled></div>' +
    '</div>' +
    '<div id="cfg-err" class="cfg-err"></div>' +
    '<button class="cfg-save" onclick="guardarConfig()">Guardar cambios</button>' +

    '<div class="cfg-title">Cuenta</div>' +
    '<div class="cfg-account-row"><span>Inicio de sesión con</span><b>Google</b></div>' +
    '<a class="cfg-logout" href="index.html" onclick="cerrarSesion(event)">' + ico('salir', 16) + 'Cerrar sesión</a>';
}

function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;'); }

async function guardarConfig() {
  if (!cfgUser) return;
  var err = document.getElementById('cfg-err'); err.textContent = '';
  var nombre = document.getElementById('cfg-nombre').value.trim();
  var apellido = document.getElementById('cfg-apellido').value.trim();
  var telefono = document.getElementById('cfg-telefono').value.trim();
  var rut = document.getElementById('cfg-rut').value.trim();

  var btn = document.querySelector('.cfg-save');
  btn.disabled = true; var txt = btn.textContent; btn.textContent = 'Guardando…';

  var r = await sb.from('perfiles').update({ nombre: nombre, apellido: apellido, telefono: telefono, rut: rut }).eq('id', cfgUser.id);
  btn.disabled = false; btn.textContent = txt;

  if (r.error) { err.textContent = 'No se pudo guardar: ' + r.error.message; return; }
  toast('Perfil actualizado.');
  userNombre = [nombre, apellido].filter(Boolean).join(' ') || userNombre;
  pintarUsuario();
}
