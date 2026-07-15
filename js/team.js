/* SPORTLY360° · js/team.js — refactor transparente: mismo código, solo reorganizado (no cambia diseño ni comportamiento). */
    /* ═══ VISTA DE EQUIPO (Jugadores / Generales / Avanzadas) ═══ */
    var teamName = null, teamSeason = null, teamRow = null, teamStats = null, teamPlayers = [], teamInfo = null, teamMatches = [];

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
        sb.from('equipos_info').select('*').eq('equipo', name).limit(1),
        sb.from('partidos').select('*').eq('competicion_id', currentId).eq('temporada', season).eq('equipo', name).order('fecha', { ascending: false }).limit(5)
      ]);
      teamRow = (r[0].data || [])[0] || null;
      teamStats = (r[2].data || [])[0] || null;
      teamInfo = (r[3].data || [])[0] || null;
      teamMatches = r[4].data || [];
      var posOrden = { Goalkeeper: 0, Defender: 1, Midfielder: 2, Attacker: 3 };
      teamPlayers = (r[1].data || []).sort(function(a, b) {
        var pa = posOrden[a.posicion], pb = posOrden[b.posicion];
        return ((pa == null ? 9 : pa) - (pb == null ? 9 : pb)) || (b.minutos || 0) - (a.minutos || 0);
      });
      renderTeam();
    }

    /* ── Formación más usada: cancha con XI probable (fotos clickables) ── */
    function _formLines(f) {
      var n = (f || '').split('-').map(function (x) { return parseInt(x, 10); }).filter(function (x) { return x > 0; });
      return n.length ? n : [4, 3, 3];
    }
    function _ini(nm) {
      var p = (nm || '?').trim().split(/\s+/);
      return (p[0].charAt(0) + (p.length > 1 ? p[p.length - 1].charAt(0) : '')).toUpperCase();
    }
    function _short(nm) { var p = (nm || '').trim().split(/\s+/); return p[p.length - 1] || nm; }
    function _buildXI(formStr, players) {
      var by = function (pos) { return players.filter(function (p) { return p.posicion === pos; }); };
      var gk = by('Goalkeeper'), def = by('Defender'), mid = by('Midfielder'), att = by('Attacker');
      var used = {};
      var take = function (pool, n) { var o = []; for (var i = 0; i < pool.length && o.length < n; i++) { if (!used[pool[i].jugador]) { used[pool[i].jugador] = 1; o.push(pool[i]); } } return o; };
      /* Rellena n jugadores probando cada pool en orden (ej. [att, mid, def]) */
      var fill = function (n, pools) {
        var o = [];
        for (var pi = 0; pi < pools.length && o.length < n; pi++) o = o.concat(take(pools[pi], n - o.length));
        return o;
      };
      var lines = _formLines(formStr), rows = [];
      var gkRow = take(gk, 1); if (!gkRow.length) gkRow = fill(1, [def, mid, att, players]); rows.push(gkRow);

      /* Línea 0 = defensas. Del resto: la línea de retención (primera tras la defensa)
         prioriza mediocampistas; las líneas más adelantadas priorizan atacantes.
         Así en 4-2-3-1 los extremos/delanteros van a la banda de ataque, no a la banca. */
      var out = lines.slice(1);        // líneas de campo tras la defensa
      var result = new Array(out.length);
      for (var i = out.length - 1; i >= 1; i--) result[i] = fill(out[i], [att, mid, def, players]);
      result[0] = out.length ? fill(out[0], [mid, att, def, players]) : [];

      rows.push(fill(lines[0], [def, mid, att, players]));   // defensa
      for (var j = 0; j < result.length; j++) rows.push(result[j]);
      return rows;
    }
    function _pitchHtml(rows) {
      var L = rows.length, html = '';
      rows.forEach(function (row, ci) {
        var x = L > 1 ? (7 + ci * (87 / (L - 1))) : 50;
        row.forEach(function (p, ri) {
          var y = (ri + 1) * (100 / (row.length + 1));
          var eq = (p.jugador || '').replace(/"/g, '&quot;');
          var img = p.foto ? '<img src="' + p.foto + '" alt="" onerror="this.style.display=\'none\'">' : '';
          html += '<div class="fp-player" data-pl="' + eq + '" onclick="event.stopPropagation();verFormJugador(this.dataset.pl)" role="button" tabindex="0" onkeydown="if(event.key===\'Enter\'){event.stopPropagation();verFormJugador(this.dataset.pl);}" style="left:' + x.toFixed(1) + '%;top:' + y.toFixed(1) + '%">' +
            '<span class="fp-ava"><b>' + _ini(p.jugador) + '</b>' + img + '</span>' +
            '<span class="fp-name">' + _short(p.jugador) + '</span></div>';
        });
      });
      return html;
    }
    function abrirFormacion() { var m = document.getElementById('form-modal'); if (m) { m.classList.remove('hidden'); document.body.style.overflow = 'hidden'; } }
    function cerrarFormacion(e) {
      if (e && e.target && !e.target.classList.contains('form-modal') && !e.target.classList.contains('form-modal-x')) return;
      var m = document.getElementById('form-modal'); if (m) m.classList.add('hidden'); document.body.style.overflow = '';
    }
    function verFormJugador(nombre) { cerrarFormacion(); verJugador(nombre, 'team'); }

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

      var esc2 = function (s) { return String(s == null ? '' : s).replace(/"/g, '&quot;'); };

      /* Modal de formación (cancha ampliable) — se conserva */
      var formModal = '';
      var _pit = '';
      if (teamPlayers.length >= 11) {
        _pit = _pitchHtml(_buildXI(es.formacion, teamPlayers));
        formModal =
          '<div id="form-modal" class="form-modal hidden" onclick="cerrarFormacion(event)">' +
            '<div class="form-modal-inner">' +
              '<button class="form-modal-x" onclick="cerrarFormacion(event)" aria-label="Cerrar">&times;</button>' +
              '<div class="fp-modal-title">' + t.equipo + ' &middot; ' + (es.formacion || 'XI probable') + '</div>' +
              '<div class="fpitch fpitch-lg">' + _pit + '</div>' +
            '</div>' +
          '</div>';
      }

      /* ── Bento 1: Últimos partidos ── */
      var ultimos = teamMatches.length ? teamMatches.map(function (m) {
        var cls = m.resultado === 'W' ? 'W' : (m.resultado === 'L' ? 'L' : 'D');
        var marcador = (m.gol_local != null && m.gol_visita != null) ? (m.gol_local + '-' + m.gol_visita) : 'vs';
        return '<div class="tm-match">' +
          '<div class="tm-t"><img src="' + esc2(m.local_logo) + '" alt="" onerror="this.style.visibility=\'hidden\'"><span' + (m.es_local ? ' class="tm-own"' : '') + '>' + m.local_nombre + '</span></div>' +
          '<div class="tm-score ' + cls + '">' + marcador + '</div>' +
          '<div class="tm-t tm-t-r"><span' + (!m.es_local ? ' class="tm-own"' : '') + '>' + m.visita_nombre + '</span><img src="' + esc2(m.visita_logo) + '" alt="" onerror="this.style.visibility=\'hidden\'"></div>' +
        '</div>';
      }).join('') : '<div class="tm-empty">Sin partidos recientes.</div>';

      /* ── Bento 2: Local vs Visita ── */
      var haCol = function (tag, cls, w, d, l, gf, ga) {
        var pjTot = (w || 0) + (d || 0) + (l || 0);
        var winPctH = pjTot ? Math.round(w / pjTot * 100) : 0;
        return '<div class="tm-ha-col">' +
          '<div class="tm-ha-tag ' + cls + '">' + tag + '</div>' +
          '<div class="tm-ha-rec">' + (w || 0) + '-' + (d || 0) + '-' + (l || 0) + ' <small>PJ ' + pjTot + '</small></div>' +
          '<div class="tm-ha-line"><span>Goles a favor</span><b>' + (gf || 0) + '</b></div>' +
          '<div class="tm-ha-line"><span>Goles en contra</span><b>' + (ga || 0) + '</b></div>' +
          '<div class="tm-ha-line"><span>% victorias</span><b>' + winPctH + '%</b></div>' +
        '</div>';
      };
      var hayHA = (es.win_local != null || es.win_visita != null);
      var localVisita = hayHA ? '<div class="tm-ha">' +
        haCol('Local', 'h', es.win_local, es.draw_local, es.lose_local, es.gf_local, es.ga_local) +
        haCol('Visita', 'a', es.win_visita, es.draw_visita, es.lose_visita, es.gf_visita, es.ga_visita) +
      '</div>' : '<div class="tm-empty">Sin datos de local/visita.</div>';

      /* ── Bento 3: Formación más usada (cancha con fotos, ampliable) ── */
      var formacionInner = _pit
        ? '<div class="tm-formacion" onclick="abrirFormacion()" role="button" tabindex="0" onkeydown="if(event.key===\'Enter\')abrirFormacion()" aria-label="Ampliar formación">' +
            '<div class="fpitch">' + _pit + '</div></div>' +
          '<div class="tm-form-name">' + (es.formacion || 'XI probable') + '</div>' +
          '<div class="tm-form-sub">' + (es.formacion_veces ? 'Usada en ' + es.formacion_veces + ' de ' + pj + ' partidos' : 'XI probable') + '</div>'
        : '<div class="tm-empty">Formación no disponible.</div>';

      /* ── Bento 4: Goles esperados (xG) ── */
      var xgFor = es.xg_favor, xgAg = es.xg_contra;
      var xgBar = function (lab, v, cls) {
        var w = v == null ? 0 : Math.max(3, Math.min(100, v / 3 * 100));
        return '<div class="tm-xg-row"><span class="tm-xg-lab">' + lab + '</span>' +
          '<div class="tm-xg-track"><div class="tm-xg-fill ' + cls + '" style="width:' + w.toFixed(0) + '%"></div></div>' +
          '<span class="tm-xg-val">' + (v == null ? '&ndash;' : Number(v).toFixed(2)) + '</span></div>';
      };
      var xgHtml = (xgFor != null || xgAg != null)
        ? xgBar('xG a favor', xgFor, 'for') + xgBar('xG en contra', xgAg, 'against')
        : '<div class="tm-empty">Calculando xG… (disponible en breve)</div>';

      /* ── Bento 5: Números de la temporada ── */
      var numMini = function (v, k, lime) { return '<div class="tm-m"><div class="tm-m-v' + (lime ? ' lime' : '') + '">' + v + '</div><div class="tm-m-k">' + k + '</div></div>'; };
      var ndDash = function (v) { return (v == null || v === '') ? '&ndash;' : v; };
      var numeros = '<div class="tm-mini">' +
        numMini(ndDash(porterias), 'Porterías imbatidas', true) +
        numMini(promGF != null ? promGF.toFixed(1) : '&ndash;', 'Goles / partido') +
        numMini(ndDash(es.mayor_victoria), 'Mayor victoria') +
        numMini(ndDash(es.racha_victorias), 'Racha de victorias') +
      '</div>';

      /* ── Lienzo oscuro (paleta ajustable en .tm-canvas del CSS) ── */
      var resumen =
        '<div class="tm-canvas"><div class="tm-bento">' +
          '<div class="tm-card tm-wide"><div class="tm-ch">Últimos partidos</div>' + ultimos + '</div>' +
          '<div class="tm-card"><div class="tm-ch">Local vs Visita</div>' + localVisita + '</div>' +
          '<div class="tm-card"><div class="tm-ch">Formación más usada</div>' + formacionInner + '</div>' +
          '<div class="tm-card tm-wide"><div class="tm-ch">Goles esperados (xG) · promedio por partido</div>' + xgHtml + '</div>' +
          '<div class="tm-card tm-wide"><div class="tm-ch">Números de la temporada</div>' + numeros + '</div>' +
        '</div></div>';

      var estadisticas = ppSection(PPICO.rend, 'Rendimiento', [
          ['Puntos/partido', pv(ppp, 2)], ['Goles/partido', pv(promGF, 2)], ['Recibidos/partido', pv(promGA, 2)], ['Dif. gol promedio', pv(dgProm, 2)],
          ['% victorias', pv(winPct, 0, '%'), { bar: winPct }], ['% derrotas', pv(losePct, 0, '%'), { bar: losePct }],
          ['% porterías imbatidas', pv(csPct, 0, '%'), { bar: csPct }], ['Tarjetas/partido', pv(cardsPP, 2)]
        ]);

      var avanzadas = ppSection(PPICO.ofe, 'Ofensivas', [
          ['Goles', pv(t.gf)], ['Promedio de goles', pv(promGF, 2)], ['Tiros', nd(es.tiros)], ['Tiros al arco', nd(es.tiros_arco)],
          ['Conversión de tiros', conv != null ? pv(conv, 0, '%') : nd(null)], ['Asistencias', nd(es.asistencias)], ['Grandes ocasiones', nd(null)]
        ]) +
        ppSection(PPICO.def, 'Defensivas', [
          ['Goles recibidos', pv(t.ga)], ['Porterías imbatidas', pv(porterias)], ['Intercepciones', nd(es.intercepciones)], ['Recuperaciones', nd(null)],
          ['Entradas', nd(es.entradas)], ['Duelos ganados', nd(es.duelos_gan)], ['Amarillas', pvCard(es.amarillas, 'c-yellow')], ['Rojas', pvCard(es.rojas, 'c-red')]
        ]) +
        '<div class="tv-note" style="margin-top:22px">Datos reales de la temporada. Tiros/entradas/duelos son la suma real de todos los jugadores de la plantilla. Grandes ocasiones, recuperaciones y colores del club quedan como "Sin datos" (no publicados por la API).</div>';

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
        '<div id="team-view-avanzadas" class="hidden">' + avanzadas + '</div>' +
        formModal;

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

