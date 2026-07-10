/* SPORTLY360° · js/ui-kit.js — sistema GLOBAL de navegación (v2.0) + skeletons + empty states.
   El breadcrumb pertenece al Layout (#crumbs-global en <main>), nunca al contenido dinámico.
   Reutiliza: ico() (icons.js), irInicio, selectComp, mostrar, seasonSel. */

/* ── Breadcrumb global ─────────────────────────────────────────────
   setCrumbs(vista, items): render único en #crumbs-global.
   vista: 'home' | 'comp' | 'team' | 'player' · items: [{label, act?}] (el último = página actual) */
var _crumbsMem = {};           /* última ruta por vista (para volver sin recargar) */
function setCrumbs(vista, items) {
  _crumbsMem[vista] = items;
  var bar = document.getElementById('crumbs-global');
  if (!bar) return;
  if (!items || items.length < 2) { bar.classList.add('hidden'); bar.innerHTML = ''; return; }   /* en Inicio no hay ruta */
  bar.classList.remove('hidden');
  var back = navHist.length
    ? '<button class="crumb-back" onclick="volverAtras()" aria-label="Volver a la vista anterior" title="Volver">' + ico('volver', 15) + '</button>'
    : '';
  bar.innerHTML = back + '<nav class="crumbs" aria-label="Ruta de navegación">' + items.map(function (it, i) {
    var sep = i > 0 ? '<span class="crumb-sep" aria-hidden="true">' + ico('chevron', 13) + '</span>' : '';
    if (!it.act) return sep + '<span class="crumb cur" aria-current="page">' + it.label + '</span>';
    return sep + '<button class="crumb" onclick="crumbAct(\'' + it.act + '\')">' + it.label + '</button>';
  }).join('') + '</nav>';
}

/* Acciones fijas del breadcrumb. Volver a comp/team NO recarga: la vista sigue
   en el DOM (oculta), así se conservan scroll, pestaña y temporada. */
function crumbAct(a) {
  if (a === 'home') { irInicio(); return; }
  if (a === 'comp') {
    if (compViewKey === currentId + '|' + currentSeason) {       /* contenido vigente → volver instantáneo */
      pushHist(); enHome = false; renderSidebar(); mostrar('comp-view'); setCrumbs('comp', _crumbsMem['comp']);
    } else selectComp(currentId);
    return;
  }
  if (a === 'team') { pushHist(); mostrar('team-view'); setCrumbs('team', _crumbsMem['team']); }
}

/* ── Historial interno (solo en memoria; sin localStorage) ── */
var navHist = [], _navBack = false;
function _vistaVisible() {
  return ['home-view', 'comp-view', 'team-view', 'player-view', 'settings-view'].filter(function (v) {
    return !document.getElementById(v).classList.contains('hidden');
  })[0];
}
function _snapLoc() {          /* descriptor exacto del punto actual */
  var v = _vistaVisible();
  if (v === 'comp-view')   return { t: 'comp', id: currentId, temp: currentSeason, tab: tab };
  if (v === 'team-view')   return { t: 'team', id: currentId, temp: teamSeason, nombre: teamName };
  if (v === 'player-view') return { t: 'player', id: currentId, temp: playerSeason, nombre: playerName, from: playerFrom };
  return { t: 'home' };
}
function pushHist() {
  if (_navBack) return;
  var s = _snapLoc();
  var top = navHist[navHist.length - 1];
  if (top && JSON.stringify(top) === JSON.stringify(s)) return;   /* sin duplicados consecutivos */
  navHist.push(s);
  if (navHist.length > 30) navHist.shift();
}
function volverAtras() {       /* vuelve EXACTAMENTE al punto anterior */
  var s = navHist.pop();
  if (!s) return;
  _navBack = true;
  try {
    if (s.t === 'home') irInicio();
    else if (s.t === 'comp') { seasonSel[s.id] = s.temp; selectComp(s.id); if (s.tab) setTab(s.tab); }
    else if (s.t === 'team') {
      enHome = false; currentId = s.id; currentComp = comps.find(function (c) { return c.id === s.id; });
      renderSidebar(); loadTeam(s.nombre, s.temp);
    } else {
      enHome = false; currentId = s.id; currentComp = comps.find(function (c) { return c.id === s.id; });
      playerFrom = s.from || 'comp'; renderSidebar(); loadPlayer(s.nombre, s.temp);
    }
  } finally { _navBack = false; }
}

/* ── Skeletons reutilizables (reemplazan el texto "Cargando…") ── */
function skelPerfil() {   /* hero + cuadrícula (jugador/equipo) */
  var cards = ''; for (var i = 0; i < 8; i++) cards += '<div class="sk-card sk"></div>';
  return '<div class="sk-hero sk"></div><div class="sk-grid">' + cards + '</div>';
}
function skelLista(n) {    /* tabla/lista (competición) */
  n = n || 10; var rows = ''; for (var i = 0; i < n; i++) rows += '<div class="sk-row sk"></div>';
  return '<div class="card" style="padding:4px">' + rows + '</div>';
}

/* ── Estado vacío elegante y reutilizable ── */
function emptyState(icon, titulo, desc, accionHtml) {
  return '<div class="empty"><span class="empty-ico">' + ico(icon || 'vacio', 26) + '</span>' +
    '<div class="empty-t">' + titulo + '</div>' +
    (desc ? '<div class="empty-d">' + desc + '</div>' : '') +
    (accionHtml || '') + '</div>';
}
