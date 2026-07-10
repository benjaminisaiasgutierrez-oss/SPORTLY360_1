/* SPORTLY360° · js/team.js — refactor transparente: mismo código, solo reorganizado (no cambia diseño ni comportamiento). */
    /* ═══ VISTA DE EQUIPO (Jugadores / Generales / Avanzadas) ═══ */
    var teamName = null, teamSeason = null, teamRow = null, teamStats = null, teamPlayers = [], teamInfo = null;

    var teamFrom = 'comp';
    function verEquipo(equipo) { teamFrom = 'comp'; loadTeam(equipo, currentSeason); }
    function cambiarTempEquipo(s) { loadTeam(teamName, s); }

    async function loadTeam(name, season) {
      pushHist();                       /* v2.0: historial en memoria */
      teamName = name; teamSeason = season;
      olvidarScroll('team-view');
      mostrar('team-view');
      setCrumbs('team', [{ label: 'Inicio', act: 'home' }, { label: currentComp.nombre, act: 'comp' }, { label: name }]);
      document.getElementById('team-view').innerHTML = skelPerfil();
      var r = await Promise.all([
        sb.from('posiciones').select('*').eq('competicion_id', currentId).eq('temporada', season).eq('equipo', name).limit(1),
        sb.from('plantilla').select('*').eq('competicion_id', currentId).eq('temporada', season).eq('equipo', name),
        sb.from('equipo_stats').select('*').eq('competicion_id', currentId).eq('temporada', season).eq('equipo', name).limit(1),
        sb.from('equipos_info').select('*').eq('equipo', name).limit(1)
      ]);
      teamRow = (r[0].data || [])[0] || null;
      teamStats = (r[2].data || [])[0] || null;
      teamInfo = (r[3].data || [])[0] || null;
      var posOrden = { Goalkeeper: 0, Defender: 1, Midfielder: 2, Attacker: 3 };
      teamPlayers = (r[1].data || []).sort(function(a, b) {
        var pa = posOrden[a.posicion], pb = posOrden[b.posicion];
        return ((pa == null ? 9 : pa) - (pb == null ? 9 : pb)) || (b.minutos || 0) - (a.minutos || 0);
      });
      renderTeam();
    }

    /* ── Panel de equipo PREMIUM (misma calidad que el perfil del jugador) ── */
    function renderTeam() {
      _ppI = 0;
      var t = teamRow;
      if (!t) { document.getElementById('team-view').innerHTML = emptyState('vacio', 'Sin datos del equipo', 'No hay información de este equipo en esta temporada. Prueba con otra temporada.'); return; }
      var es = teamStats || {};
      var ei = teamInfo || {};
      var pj = t.played || 0;

      /* Métricas derivadas (solo con datos ya cargados; null si falta el denominador) */
      var promGF = pj ? Number((t.gf / pj).toFixed(2)) : null;
      var promGA = pj ? Number((t.ga / pj).toFixed(2)) : null;
      var dgProm = pj ? Number((t.gd / pj).toFixed(2)) : null;
      var winPct = pj ? Math.round(t.win / pj * 100) : null;
      var losePct = pj ? Math.round(t.lose / pj * 100) : null;
      var ppp = pj ? Number((t.points / pj).toFixed(2)) : null;
      var porterias = (es.porterias != null) ? es.porterias : null;
      var csPct = (porterias != null && pj) ? Math.round(porterias / pj * 100) : null;
      var cards = (es.amarillas != null || es.rojas != null) ? ((es.amarillas || 0) + (es.rojas || 0)) : null;
      var cardsPP = (cards != null && pj) ? Number((cards / pj).toFixed(2)) : null;
      var conv = (es.tiros) ? Math.round(t.gf / es.tiros * 100) : null;
      var pais = (currentComp.tipo === 'league') ? currentComp.pais : null;

      /* Radar del equipo: Ataque · Defensa · Disciplina · Rendimiento · Solidez */
      var pct = function (v, cap) { return v == null ? null : Math.max(0, Math.min(100, v / cap * 100)); };
      var cats = {
        'Ataque': promGF == null ? null : Math.round(pct(promGF, 2.5)),
        'Defensa': promGA == null ? null : Math.round(Math.max(0, 100 - pct(promGA, 2.5))),
        'Disciplina': cardsPP == null ? null : Math.round(Math.max(0, 100 - pct(cardsPP, 3.5))),
        'Rendimiento': ppp == null ? null : Math.round(pct(ppp, 3)),
        'Solidez': csPct == null ? null : Math.round(Math.min(100, csPct * 1.6))
      };

      /* Íconos (reutiliza ppSvg; PPICO se reutiliza para las secciones comunes) */
      var TI = {
        info: ppSvg('<path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M9 21v-6h6v6"/>'),
        forma: ppSvg('<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>'),
        users: ppSvg('<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>')
      };

      /* Hero: escudo + nombre + liga/temporada/país + tarjetas resumen */
      var hstat = function (v, k, cls) { return '<div class="pp-hstat' + (cls || '') + '"><div class="v">' + v + '</div><div class="k">' + k + '</div></div>'; };
      var hero =
        '<div class="pp-hero">' +
          '<div class="pp-photo pp-crest"><img src="' + (t.logo || '') + '" onerror="this.style.visibility=\'hidden\'"></div>' +
          '<div class="pp-hero-info">' +
            '<div class="pp-name">' + t.equipo + '</div>' +
            '<div class="pp-team">' + currentComp.nombre + ' &middot; ' + teamSeason + (pais ? ' &middot; ' + pais : '') + '</div>' +
            (t.grupo ? '<div class="pp-chips"><span class="pp-chip">' + t.grupo.replace('Group', 'Grupo') + '</span></div>' : '') +
            '<div class="pp-hero-stats">' +
              hstat(t.rank + '&deg;', 'Puesto', ' pp-rating') +
              hstat(t.points, 'Puntos') +
              hstat((t.gd > 0 ? '+' : '') + t.gd, 'Dif. gol') +
              hstat(t.win + '-' + t.draw + '-' + t.lose, 'V-E-D') +
            '</div>' +
          '</div>' +
          star('equipo', currentId + '|' + teamSeason + '|' + t.equipo, t.equipo, { logo: t.logo, comp: currentComp.nombre, cid: currentId, temp: teamSeason }) +
          '<div class="season-nav">' + seasonNavInner(teamSeason, 'cambiarTempEquipo') + '</div>' +
        '</div>';

      /* Forma reciente (real si existe; si no, estructura lista) */
      var forma = t.form
        ? '<div class="tv-form" style="margin:2px 2px 0">' + formHtml(t.form) + '</div>'
        : '<div class="pp-desc" style="font-size:13px;margin:2px">Forma reciente no disponible</div>';

      /* Jugadores del equipo: plantilla completa (tabla clickable, se conserva la funcionalidad) */
      var posLabel = { Goalkeeper: 'POR', Defender: 'DEF', Midfielder: 'MED', Attacker: 'DEL' };
      var rows = teamPlayers.length ? teamPlayers.map(function (p, i) {
        var eq = (p.jugador || '').replace(/"/g, '&quot;');
        return '<tr class="team-row" data-pl="' + eq + '" onclick="verJugador(this.dataset.pl, \'team\')">' +
          '<td class="pos">' + (i + 1) + '</td>' +
          '<td><div class="team-cell">' + avatar(p.jugador, p.foto) + '<span>' + p.jugador + '</span></div></td>' +
          '<td class="dim">' + (posLabel[p.posicion] || p.posicion || '&ndash;') + '</td>' +
          '<td class="dim">' + (p.partidos || 0) + '</td>' +
          '<td class="pts">' + (p.goles || 0) + '</td><td>' + (p.asistencias || 0) + '</td>' +
          '<td class="c-yellow">' + (p.amarillas != null ? p.amarillas : 0) + '</td><td class="c-red">' + (p.rojas != null ? p.rojas : 0) + '</td></tr>';
      }).join('') : '<tr><td colspan="8" class="loading">Sin datos de jugadores para esta temporada.</td></tr>';
      var jugadores = '<div class="pp-title"><span class="pp-tico">' + TI.users + '</span>Jugadores (' + teamPlayers.length + ')</div>' +
        '<div class="card"><table><thead><tr><th>#</th><th class="team-col">Jugador</th><th>Pos</th><th>PJ</th><th>Goles</th><th>Asist.</th><th><span class="cd cd-y"></span></th><th><span class="cd cd-r"></span></th></tr></thead><tbody>' + rows + '</tbody></table></div>';

      var resumen = radarSvg(cats) +
        '<div class="pp-title"><span class="pp-tico">' + TI.forma + '</span>Forma reciente</div>' + forma +
        ppSection(TI.info, 'Información general', [
          ['Nombre', t.equipo], ['Nombre corto', nd(ei.codigo)], ['País', nd(ei.pais || pais)], ['Fundación', nd(ei.fundacion)],
          ['Estadio', nd(ei.estadio)], ['Capacidad', ei.capacidad != null ? Number(ei.capacidad).toLocaleString('es-CL') : nd(null)],
          ['Ciudad', nd(ei.ciudad)], ['Entrenador', nd(ei.entrenador)], ['Colores', nd(null)]
        ]);

      var estadisticas = ppSection(PPICO.rend, 'Rendimiento', [
          ['Puntos/partido', pv(ppp, 2)], ['Goles/partido', pv(promGF, 2)], ['Recibidos/partido', pv(promGA, 2)], ['Dif. gol promedio', pv(dgProm, 2)],
          ['% victorias', pv(winPct, 0, '%'), { bar: winPct }], ['% derrotas', pv(losePct, 0, '%'), { bar: losePct }],
          ['% porterías imbatidas', pv(csPct, 0, '%'), { bar: csPct }], ['Tarjetas/partido', pv(cardsPP, 2)]
        ]);

      var avanzadas = ppSection(PPICO.ofe, 'Ofensivas', [
          ['Goles', pv(t.gf)], ['Promedio de goles', pv(promGF, 2)], ['Tiros', nd(es.tiros)], ['Tiros al arco', nd(es.tiros_arco)],
          ['Conversión de tiros', conv != null ? pv(conv, 0, '%') : nd(null)], ['Asistencias', nd(null)], ['Grandes ocasiones', nd(null)]
        ]) +
        ppSection(PPICO.def, 'Defensivas', [
          ['Goles recibidos', pv(t.ga)], ['Porterías imbatidas', pv(porterias)], ['Intercepciones', nd(null)], ['Recuperaciones', nd(null)],
          ['Entradas', nd(null)], ['Duelos ganados', nd(null)], ['Amarillas', pvCard(es.amarillas, 'c-yellow')], ['Rojas', pvCard(es.rojas, 'c-red')]
        ]) +
        '<div class="tv-note" style="margin-top:22px">Datos reales de la temporada y métricas derivadas. Tiros, córners y posesión de equipo quedan como "Sin datos" (no publicados por la API).</div>';

      document.getElementById('team-view').innerHTML = hero +
        '<div class="cc-chips" id="team-chips" role="group" aria-label="Secciones del equipo">' +
          '<button class="cc-chip active" id="tchip-resumen" onclick="setTeamTab(\'resumen\')" aria-pressed="true">Resumen</button>' +
          '<button class="cc-chip" id="tchip-jugadores" onclick="setTeamTab(\'jugadores\')" aria-pressed="false">Jugadores (' + teamPlayers.length + ')</button>' +
          '<button class="cc-chip" id="tchip-estadisticas" onclick="setTeamTab(\'estadisticas\')" aria-pressed="false">Estadísticas</button>' +
          '<button class="cc-chip" id="tchip-avanzadas" onclick="setTeamTab(\'avanzadas\')" aria-pressed="false">Avanzadas</button>' +
        '</div>' +
        '<div id="team-view-resumen">' + resumen + '</div>' +
        '<div id="team-view-jugadores" class="hidden">' + jugadores + '</div>' +
        '<div id="team-view-estadisticas" class="hidden">' + estadisticas + '</div>' +
        '<div id="team-view-avanzadas" class="hidden">' + avanzadas + '</div>';

      animarBarras();
      animarContadores();
    }

    function setTeamTab(t) {
      ['resumen', 'jugadores', 'estadisticas', 'avanzadas'].forEach(function (k) {
        var chip = document.getElementById('tchip-' + k);
        if (chip) { chip.classList.toggle('active', k === t); chip.setAttribute('aria-pressed', String(k === t)); }
        var view = document.getElementById('team-view-' + k);
        if (view) view.classList.toggle('hidden', k !== t);
      });
    }

