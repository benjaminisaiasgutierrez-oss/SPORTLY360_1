/* SPORTLY360° · js/dashboard.js — refactor transparente: mismo código, solo reorganizado (no cambia diseño ni comportamiento). */
    /* ═══════════ DASHBOARD (Fase 2) + BUSCADOR GLOBAL (Fase 3) ═══════════ */
    /* Íconos SVG monocromos outline (reutilizan currentColor; lima solo en hover) */
    function dico(p, sz) { return '<svg viewBox="0 0 24 24" width="' + (sz || 20) + '" height="' + (sz || 20) + '" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + p + '</svg>'; }
    var DICO = {
      grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>',
      target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
      share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>',
      calToday: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><polyline points="9 15 11 17 15 13"/>',
      clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
      star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
      shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
      user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
      trophy: '<path d="M8 21h8M12 17v4"/><path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 4H4v2a3 3 0 0 0 3 3M17 4h3v2a3 3 0 0 1-3 3"/>',
      flame: '<path d="M12 2c1 3 5 4 5 9a5 5 0 0 1-10 0c0-2 1-3 1-3s0 2 2 2a2 2 0 0 0 2-2c0-3-2-4-2-6z"/>',
      search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>'
    };

    /* Temporada más reciente global (para la cabecera) */
    function tempActual() {
      var all = {}; Object.keys(seasonsMap).forEach(function (c) { Object.keys(seasonsMap[c]).forEach(function (s) { all[s] = 1; }); });
      return Object.keys(all).sort().reverse()[0] || '';
    }

    /* Muestra el dashboard (se renderiza una vez; se reutiliza al volver) */
    function irInicio() {
      pushHist();                       /* v2.0: historial en memoria */
      enHome = true; renderSidebar();
      setCrumbs('home', []);            /* en Inicio no hay ruta que mostrar */
      mostrar('home-view');
      if (!document.getElementById('ds-input')) renderHome();
    }

    /* Aviso breve para funciones aún no disponibles */
    var _tt;
    function toast(msg) {
      var el = document.getElementById('sp-toast');
      if (!el) { el = document.createElement('div'); el.id = 'sp-toast'; document.body.appendChild(el); }
      el.textContent = msg; el.className = 'show';
      clearTimeout(_tt); _tt = setTimeout(function () { el.className = ''; }, 2600);
    }
    function dashAccion(k) {
      if (k === 'comp') document.getElementById('qa-anchor').scrollIntoView({ behavior: 'smooth', block: 'start' });
      else if (k === 'gol') { var f = comps.find(function (c) { return c.tipo === 'league'; }); if (f) { selectComp(f.id); setTimeout(function () { setTab('gol'); }, 350); } }
      else if (k === 'cal') toast('No hay partidos disponibles (estructura preparada).');
      else if (k === 'fav') document.getElementById('fav-anchor').scrollIntoView({ behavior: 'smooth', block: 'start' });
      else toast('Función próximamente.');
    }

    /* Render del dashboard */
    function renderHome() {
      var nombre = (document.getElementById('greet-name') || {}).textContent || 'jugador';
      var fecha = new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      var cap = function (s) { return s.charAt(0).toUpperCase() + s.slice(1); };

      var cardDefs = [
        [DICO.grid, 'Competiciones', 'Ligas y copas', 'comp'],
        [DICO.target, 'Goleadores', 'Máximos anotadores', 'gol'],
        [DICO.share, 'Asistencias', 'Próximamente', 'na'],
        [DICO.calToday, 'Partidos de hoy', 'No disponible', 'cal'],
        [DICO.clock, 'Próximos partidos', 'No disponible', 'cal'],
        [DICO.flame, 'Partidos destacados', 'No disponible', 'cal'],
        [DICO.star, 'Equipos favoritos', 'Ver tus guardados', 'fav'],
        [DICO.user, 'Jugadores favoritos', 'Ver tus guardados', 'fav']
      ];
      var cards = cardDefs.map(function (c) {
        return '<div class="dash-card" onclick="dashAccion(\'' + c[3] + '\')"><span class="dc-ico">' + dico(c[0]) + '</span>' +
          '<div class="dc-t">' + c[1] + '</div><div class="dc-s">' + c[2] + '</div></div>';
      }).join('');
      var qa = comps.map(function (c) {
        return '<div class="qa-btn" onclick="selectComp(\'' + c.id + '\')"><img src="' + c.logo + '" alt="">' + c.nombre + '</div>';
      }).join('');
      var sk = function () { return '<div class="qstat"><div class="qs-v"><span class="sk" style="display:inline-block;width:70%;height:15px"></span></div><div class="qs-k"><span class="sk" style="display:inline-block;width:50%;height:9px;margin-top:5px"></span></div></div>'; };

      document.getElementById('home-view').innerHTML =
        '<div class="dash-head"><div><div class="dash-hi">Hola, ' + nombre + '</div>' +
          '<div class="dash-sub"><span>' + cap(fecha) + '</span><span>Temporada <b>' + tempActual() + '</b></span></div></div></div>' +
        '<div class="dash-search"><span class="ds-ico">' + dico(DICO.search, 18) + '</span>' +
          '<input id="ds-input" type="text" placeholder="Buscar jugadores, equipos o competiciones…" oninput="dsBuscar(this.value)" onblur="setTimeout(cerrarBuscador,180)">' +
          '<div id="ds-results" class="dash-results hidden"></div></div>' +
        '<div class="dash-title">Explorar</div><div class="dash-grid">' + cards + '</div>' +
        '<div class="dash-title" id="qa-anchor">Accesos rápidos</div><div class="qa-grid">' + qa + '</div>' +
        '<div class="dash-title">Estadísticas rápidas</div><div class="qstat-grid" id="qstats">' + sk() + sk() + sk() + sk() + sk() + '</div>' +
        '<div class="dash-title" id="fav-anchor">Tus favoritos</div><div id="fav-section"></div>' +
        '<div class="dash-title">Actividad reciente</div><div class="tv-note">No hay actividad reciente.</div>';

      cargarDestacados();
      renderFavoritos();   /* v1.1: pinta la sección de favoritos (se refresca al cargar sesión) */
    }

    /* Estadísticas rápidas de una liga destacada (datos reales; cacheado, sin re-consultar) */
    var featCache = null;
    async function cargarDestacados() {
      var fc = comps.find(function (c) { return c.tipo === 'league'; });
      if (!fc) return;
      var temp = Object.keys(seasonsMap[fc.id] || {}).sort().reverse()[0];
      if (!featCache || featCache.id !== fc.id || featCache.temp !== temp) {
        var r = await Promise.all([
          sb.from('posiciones').select('equipo,gf,ga,rank').eq('competicion_id', fc.id).eq('temporada', temp),
          sb.from('goleadores').select('jugador,goles').eq('competicion_id', fc.id).eq('temporada', temp).order('rank').limit(1)
        ]);
        featCache = { id: fc.id, temp: temp, pos: r[0].data || [], gol: (r[1].data || [])[0] || null, nombre: fc.nombre };
      }
      var pos = featCache.pos, box = document.getElementById('qstats');
      if (!box) return;
      if (!pos.length) { box.innerHTML = '<div class="tv-note">Sin datos.</div>'; return; }
      var lider = pos.reduce(function (a, b) { return b.rank < a.rank ? b : a; });
      var atk = pos.reduce(function (a, b) { return b.gf > a.gf ? b : a; });
      var def = pos.reduce(function (a, b) { return b.ga < a.ga ? b : a; });
      var prom = (pos.reduce(function (s, t) { return s + (t.gf || 0); }, 0) / pos.length).toFixed(1);
      var top = featCache.gol;
      var qs = function (ico, v, k) { return '<div class="qstat"><span class="qs-ico">' + dico(ico, 16) + '</span><div class="qs-v">' + v + '</div><div class="qs-k">' + k + ' &middot; ' + featCache.nombre + '</div></div>'; };
      box.innerHTML =
        qs(DICO.target, top ? top.jugador + ' (' + top.goles + ')' : nd(null), 'Máximo goleador') +
        qs(DICO.flame, atk.equipo, 'Mejor ataque') +
        qs(DICO.shield, def.equipo, 'Mejor defensa') +
        qs(DICO.trophy, lider.equipo, 'Líder') +
        qs(DICO.share, prom, 'Prom. goles/equipo');
    }

