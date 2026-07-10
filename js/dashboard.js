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

    /* Render del dashboard (v3.0: inicio rediseñado, identidad negro + lima) */
    function renderHome() {
      var nombre = (document.getElementById('greet-name') || {}).textContent || 'jugador';
      var fecha = new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      var cap = function (s) { return s.charAt(0).toUpperCase() + s.slice(1); };

      var chips = comps.map(function (c) {
        return '<div class="h2-chip" role="button" tabindex="0" onclick="selectComp(\'' + c.id + '\')" onkeydown="navKey(event)"><img src="' + c.logo + '" alt="">' + c.nombre + '</div>';
      }).join('');

      var quickDefs = [
        [DICO.target, 'Goleadores', 'gol', false],
        [DICO.calToday, 'Partidos de hoy', 'cal', true],
        [DICO.clock, 'Próximos partidos', 'cal', true],
        [DICO.share, 'Asistencias', 'na', true]
      ];
      var quick = quickDefs.map(function (q) {
        return '<div class="h2-ql' + (q[3] ? ' soon' : '') + '" role="button" tabindex="0" onclick="dashAccion(\'' + q[2] + '\')" onkeydown="navKey(event)">' +
          '<span class="h2-ql-ico">' + dico(q[0], 17) + '</span><span class="h2-ql-t">' + q[1] + '</span>' +
          (q[3] ? '<span class="h2-ql-tag">Pronto</span>' : '') + '</div>';
      }).join('');

      document.getElementById('home-view').innerHTML =
        '<div class="h2-hero"><div class="h2-hi">Hola, ' + nombre + '</div>' +
          '<div class="h2-sub">' + cap(fecha) + '<span class="h2-dot">&middot;</span>Temporada <b>' + tempActual() + '</b></div></div>' +

        '<div class="h2-search"><span class="ds-ico">' + dico(DICO.search, 18) + '</span>' +
          '<input id="ds-input" type="text" placeholder="Buscar jugadores, equipos o competiciones…" oninput="dsBuscar(this.value)" onblur="setTimeout(cerrarBuscador,180)">' +
          '<div id="ds-results" class="dash-results hidden"></div></div>' +

        '<div class="h2-title" id="qa-anchor">Competiciones</div><div class="h2-chips">' + chips + '</div>' +

        '<div class="h2-title">Destacado</div><div class="h2-feature" id="h2-feature"><div class="tv-note">Cargando…</div></div>' +

        '<div class="h2-cols">' +
          '<div class="h2-col"><div class="h2-title" id="fav-anchor">Tus favoritos</div><div id="fav-section"></div></div>' +
          '<div class="h2-col"><div class="h2-title">Accesos rápidos</div><div class="h2-quicklist">' + quick + '</div></div>' +
        '</div>';

      cargarDestacados();
      renderFavoritos();   /* v1.1: pinta la sección de favoritos (se refresca al cargar sesión) */
    }

    /* Tarjeta destacada de la liga principal (datos reales; cacheado, sin re-consultar) */
    var featCache = null;
    async function cargarDestacados() {
      var box = document.getElementById('h2-feature');
      if (!box) return;
      var fc = comps.find(function (c) { return c.tipo === 'league'; });
      if (!fc) { box.innerHTML = '<div class="tv-note">Sin competiciones destacadas.</div>'; return; }
      var temp = Object.keys(seasonsMap[fc.id] || {}).sort().reverse()[0];
      if (!featCache || featCache.id !== fc.id || featCache.temp !== temp) {
        var r = await Promise.all([
          sb.from('posiciones').select('equipo,gf,ga,rank').eq('competicion_id', fc.id).eq('temporada', temp),
          sb.from('goleadores').select('jugador,goles').eq('competicion_id', fc.id).eq('temporada', temp).order('rank').limit(1)
        ]);
        featCache = { id: fc.id, temp: temp, pos: r[0].data || [], gol: (r[1].data || [])[0] || null, nombre: fc.nombre, logo: fc.logo };
      }
      var pos = featCache.pos;
      var head = '<div class="h2-feat-head" role="button" tabindex="0" onclick="selectComp(\'' + fc.id + '\')" onkeydown="navKey(event)">' +
        '<img src="' + featCache.logo + '" alt=""><div><div class="h2-feat-name">' + featCache.nombre + '</div>' +
        '<div class="h2-feat-sub">Temporada ' + temp + '</div></div><span class="h2-feat-go">Ver competición →</span></div>';
      if (!pos.length) { box.innerHTML = head + '<div class="tv-note" style="margin-top:14px">Sin datos.</div>'; return; }
      var lider = pos.reduce(function (a, b) { return b.rank < a.rank ? b : a; });
      var atk = pos.reduce(function (a, b) { return b.gf > a.gf ? b : a; });
      var def = pos.reduce(function (a, b) { return b.ga < a.ga ? b : a; });
      var prom = (pos.reduce(function (s, t) { return s + (t.gf || 0); }, 0) / pos.length).toFixed(1);
      var top = featCache.gol;
      var stat = function (ico, k, v) { return '<div class="h2-stat"><span class="h2-stat-ico">' + dico(ico, 16) + '</span><div class="h2-stat-v">' + v + '</div><div class="h2-stat-k">' + k + '</div></div>'; };
      box.innerHTML = head + '<div class="h2-feat-stats">' +
        stat(DICO.trophy, 'Líder', lider.equipo) +
        stat(DICO.target, 'Goleador', top ? top.jugador + ' (' + top.goles + ')' : nd(null)) +
        stat(DICO.flame, 'Mejor ataque', atk.equipo) +
        stat(DICO.shield, 'Mejor defensa', def.equipo) +
        stat(DICO.share, 'Prom. goles', prom) +
      '</div>';
    }

