/* SPORTLY360° · js/favorites.js — Sistema de favoritos (Supabase, por usuario autenticado).
   Reutiliza: sb, toast(), selectComp(), abrirEquipo(), abrirJugador(), starSvg-style acorde a la identidad. */
var misFavoritos = {};   // clave -> fila de la BD
var favUser = null;      // uuid del usuario (o null si no hay sesión)
var favRegistry = {};    // clave -> {tipo,clave,nombre,extra}  (datos para el onclick del botón)

/* Carga (una sola vez) los favoritos del usuario y sincroniza la UI */
async function cargarFavoritos() {
  try {
    var u = await sb.auth.getUser();
    favUser = (u.data && u.data.user) ? u.data.user.id : null;
    if (!favUser) return;
    var r = await sb.from('favoritos').select('*').eq('user_id', favUser);
    misFavoritos = {};
    (r.data || []).forEach(function (f) { misFavoritos[f.clave] = f; });
    actualizarBotonesFav();
    if (typeof enHome !== 'undefined' && enHome) renderFavoritos();
  } catch (e) { /* sin sesión: favoritos deshabilitados silenciosamente */ }
}

function esFavorito(clave) { return !!misFavoritos[clave]; }

/* Estrella SVG outline (vacía) o rellena en lima (favorito) */
function starSvg(on) {
  return '<svg viewBox="0 0 24 24" width="18" height="18" fill="' + (on ? 'var(--accent)' : 'none') +
    '" stroke="' + (on ? 'var(--accent)' : 'currentColor') + '" stroke-width="2" stroke-linejoin="round">' +
    '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';
}

/* Botón favorito reutilizable (perfil jugador/equipo, competición) */
function star(tipo, clave, nombre, extra) {
  favRegistry[clave] = { tipo: tipo, clave: clave, nombre: nombre, extra: extra || {} };
  var esc = String(clave).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  var on = esFavorito(clave);
  return '<button class="fav-btn' + (on ? ' on' : '') + '" data-clave="' + esc + '" onclick="clickFav(this)" aria-label="Favorito" title="Guardar en favoritos">' + starSvg(on) + '</button>';
}
function clickFav(btn) {
  btn.classList.remove('pop'); void btn.offsetWidth; btn.classList.add('pop');   /* microinteracción (120-250 ms) */
  var d = favRegistry[btn.dataset.clave]; if (d) toggleFavorito(d.tipo, d.clave, d.nombre, d.extra);
}

/* Alterna un favorito con feedback (toast unificado) */
async function toggleFavorito(tipo, clave, nombre, extra) {
  if (!favUser) { toast('Inicia sesión para guardar favoritos'); return; }
  if (misFavoritos[clave]) {
    await sb.from('favoritos').delete().eq('user_id', favUser).eq('clave', clave);
    delete misFavoritos[clave];
    toast(nombre + ' quitado de favoritos');
  } else {
    var fila = { user_id: favUser, tipo: tipo, clave: clave, nombre: nombre, extra: extra || {} };
    var r = await sb.from('favoritos').insert(fila);
    if (r.error) { toast('No se pudo guardar'); return; }
    misFavoritos[clave] = fila;
    toast(nombre + ' agregado a favoritos');
  }
  actualizarBotonesFav();
  if (typeof enHome !== 'undefined' && enHome) renderFavoritos();
}

/* Sincroniza el estado visual de todos los botones visibles */
function actualizarBotonesFav() {
  document.querySelectorAll('.fav-btn').forEach(function (b) {
    var on = esFavorito(b.dataset.clave);
    b.classList.toggle('on', on);
    b.innerHTML = starSvg(on);
  });
}

/* Sección de favoritos del dashboard (agrupada + estado vacío elegante) */
function renderFavoritos() {
  var cont = document.getElementById('fav-section');
  if (!cont) return;
  if (!favUser) { cont.innerHTML = '<div class="fav-empty">Inicia sesión para guardar tus favoritos.</div>'; return; }
  var favs = Object.values(misFavoritos);
  if (!favs.length) {
    cont.innerHTML = '<div class="fav-empty"><span class="fav-empty-ico">' + starSvg(false) + '</span> ' +
      'Aún no tienes favoritos. Toca la estrella en un jugador, equipo o competición para guardarlo aquí.</div>';
    return;
  }
  var etq = { jugador: 'Jugador', equipo: 'Equipo', competicion: 'Competición' };
  var esc = function (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;'); };
  var orden = { competicion: 0, equipo: 1, jugador: 2 };
  favs.sort(function (a, b) { return (orden[a.tipo] - orden[b.tipo]) || String(a.nombre).localeCompare(b.nombre); });
  cont.innerHTML = '<div class="fav-grid">' + favs.map(function (f) {
    var e = f.extra || {};
    var img = e.foto || e.logo;
    var thumb = img ? '<img src="' + img + '" onerror="this.style.display=\'none\'">' : '<span class="fav-ph">' + starSvg(false) + '</span>';
    return '<div class="fav-card" data-tipo="' + f.tipo + '" data-clave="' + esc(f.clave) + '" data-cid="' + esc(e.cid || f.clave) + '" data-temp="' + esc(e.temp || '') + '" data-nombre="' + esc(f.nombre) + '" onclick="abrirFav(this)">' +
      thumb + '<div class="fav-info"><div class="fav-n">' + f.nombre + '</div><div class="fav-c">' + (e.comp || etq[f.tipo]) + '</div></div></div>';
  }).join('') + '</div>';
}
/* Abre el perfil correspondiente desde una tarjeta de favorito */
function abrirFav(el) {
  var t = el.dataset.tipo;
  if (t === 'competicion') selectComp(el.dataset.clave);
  else if (t === 'equipo') abrirEquipo(el.dataset.cid, el.dataset.temp, el.dataset.nombre);
  else abrirJugador(el.dataset.cid, el.dataset.temp, el.dataset.nombre);
}
