/* SPORTLY360° · js/team.js — refactor transparente: mismo código, solo reorganizado (no cambia diseño ni comportamiento). */
    /* ═══ VISTA DE EQUIPO (Jugadores / Generales / Avanzadas) ═══ */
    var teamName = null, teamSeason = null, teamRow = null, teamStats = null, teamPlayers = [], teamInfo = null, teamMatches = [], teamMatchStats = {};

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
        sb.from('partidos').select('*').eq('competicion_id', currentId).eq('temporada', season).eq('equipo', name).order('fecha', { ascending: true })
      ]);
      teamRow = (r[0].data || [])[0] || null;
      teamStats = (r[2].data || [])[0] || null;
      teamInfo = (r[3].data || [])[0] || null;
      teamMatches = r[4].data || [];   /* TODOS los partidos, ascendente (más antiguo → más reciente) */
      /* Estadísticas por partido: solo cargo las de los últimos ~10 (las demás bajo demanda) */
      teamMatchStats = {};
      var fids = teamMatches.slice(-10).map(function (m) { return m.fixture_id; }).filter(Boolean);
      if (fids.length) {
        var ps = await sb.from('partido_stats').select('*').in('fixture_id', fids);
        (ps.data || []).forEach(function (row) {
          (teamMatchStats[row.fixture_id] = teamMatchStats[row.fixture_id] || {})[row.side] = row;
        });
      }
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
      /* Cancha VERTICAL: arquero abajo (rows[0]), ataque arriba (última fila).
         Cada fila se reparte horizontalmente; las filas se reparten en vertical. */
      var L = rows.length, html = '';
      rows.forEach(function (row, ci) {
        var y = L > 1 ? (90 - ci * (80 / (L - 1))) : 50;   // ci=0 (arquero) abajo 90%, ataque arriba 10%
        row.forEach(function (p, ri) {
          var x = (ri + 1) * (100 / (row.length + 1));      // reparto horizontal dentro de la línea
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

    /* ═══ Estadísticas por partido (diseño premium .mx) — todos los partidos de la
       temporada. Selector: más antiguo (izq) → más reciente (der). Default = el más reciente. ═══ */
    var _statIdx = 0, _matchSub = 'resumen';
    function statMatchChips() {
      return teamMatches.map(function (m, i) {
        var mine = m.es_local ? m.gol_local : m.gol_visita;
        var opp = m.es_local ? m.gol_visita : m.gol_local;
        var rival = m.es_local ? m.visita_nombre : m.local_nombre;
        var marc = (mine != null && opp != null) ? (mine + '-' + opp) : 'vs';
        return '<button class="ms-chip' + (i === _statIdx ? ' active' : '') + '" id="ms-chip-' + i + '" onclick="setStatMatch(' + i + ')">' +
          '<span class="ms-badge ms-' + (m.resultado || 'D') + '">' + marc + '</span>' + _short(rival) + '</button>';
      }).join('');
    }
    function moveStatMatch(dir) { setStatMatch(_statIdx + dir); }
    async function setStatMatch(i) {
      i = Math.max(0, Math.min(teamMatches.length - 1, i));
      _statIdx = i; _matchSub = 'resumen';
      teamMatches.forEach(function (_, k) {
        var c = document.getElementById('ms-chip-' + k);
        if (c) c.classList.toggle('active', k === i);
      });
      var activo = document.getElementById('ms-chip-' + i);
      if (activo && activo.scrollIntoView) activo.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
      var pa = document.getElementById('ms-prev'), na = document.getElementById('ms-next');
      if (pa) pa.disabled = (i <= 0);
      if (na) na.disabled = (i >= teamMatches.length - 1);
      var m = teamMatches[i];
      if (m && m.fixture_id && !teamMatchStats[m.fixture_id]) {
        try {
          var ps = await sb.from('partido_stats').select('*').eq('fixture_id', m.fixture_id);
          (ps.data || []).forEach(function (row) { (teamMatchStats[row.fixture_id] = teamMatchStats[row.fixture_id] || {})[row.side] = row; });
        } catch (e) { /* sin conexión */ }
      }
      var panel = document.getElementById('ms-panel');
      if (panel) panel.innerHTML = statMatchPanel(i);
    }

    /* helpers de formato/porcentaje */
    function _pct(h, a) { var t = Math.abs(h || 0) + Math.abs(a || 0); return t ? Math.round(Math.abs(h || 0) / t * 100) : 50; }
    function _val(v, suf, dec) { if (v == null || v === '') return '&ndash;'; return (dec ? Number(v).toFixed(dec) : v) + (suf || ''); }

    /* Definición de todas las estadísticas del partido con su grupo (sub-pestaña) */
    function matchStatsDefs(H, A) {
      return [
        ['Goles esperados (xG)', H.xg, A.xg, '', 2, ['resumen', 'ataque']],
        ['Remates totales', H.tiros, A.tiros, '', 0, ['resumen', 'ataque']],
        ['Remates al arco', H.tiros_arco, A.tiros_arco, '', 0, ['resumen', 'ataque']],
        ['Remates fuera', H.tiros_fuera, A.tiros_fuera, '', 0, ['ataque']],
        ['Remates bloqueados', H.bloqueados, A.bloqueados, '', 0, ['ataque', 'defensa']],
        ['Remates dentro del área', H.dentro_area, A.dentro_area, '', 0, ['ataque']],
        ['Remates fuera del área', H.fuera_area, A.fuera_area, '', 0, ['ataque']],
        ['Córners', H.corners, A.corners, '', 0, ['resumen', 'ataque']],
        ['Posesión', H.posesion, A.posesion, '%', 0, ['resumen', 'pases']],
        ['Pases', H.pases, A.pases, '', 0, ['resumen', 'pases']],
        ['Pases completados', H.pases_ok, A.pases_ok, '', 0, ['pases']],
        ['Precisión de pase', H.pases_pct, A.pases_pct, '%', 0, ['pases']],
        ['Atajadas', H.atajadas, A.atajadas, '', 0, ['defensa']],
        ['Faltas', H.faltas, A.faltas, '', 0, ['defensa', 'disciplina']],
        ['Fuera de juego', H.offsides, A.offsides, '', 0, ['disciplina']],
        ['Amarillas', H.amarillas, A.amarillas, '', 0, ['disciplina']],
        ['Rojas', H.rojas, A.rojas, '', 0, ['disciplina']]
      ];
    }
    function matchCmpHtml(i, group) {
      var m = teamMatches[i], ps = teamMatchStats[m.fixture_id];
      var H = ps && ps.home, A = ps && ps.away;
      if (!H || !A) return '<div class="mx-empty">Este partido aún no tiene estadísticas detalladas.</div>';
      var defs = matchStatsDefs(H, A).filter(function (d) { return d[5].indexOf(group) >= 0; });
      var rows = defs.map(function (d) {
        var h = d[1], a = d[2], suf = d[3], dec = d[4];
        var hn = (h == null ? 0 : Number(h)), an = (a == null ? 0 : Number(a));
        var hs = _pct(hn, an), as = 100 - hs, hw = hn > an, aw = an > hn;
        return '<div class="stat-row">' +
          '<span class="stat-value' + (hw ? '' : ' dimv') + '">' + _val(h, suf, dec) + '</span>' +
          '<div class="side-bar home"><i style="--w:' + hs + '%"></i></div>' +
          '<span class="stat-label">' + d[0] + '</span>' +
          '<div class="side-bar away"><i style="--w:' + as + '%"></i></div>' +
          '<span class="stat-value away' + (aw ? '' : ' dimv') + '">' + _val(a, suf, dec) + '</span></div>';
      }).join('');
      return '<div class="stats-list">' + rows + '</div>';
    }
    function setMatchSubtab(g) {
      _matchSub = g;
      ['resumen', 'ataque', 'pases', 'defensa', 'disciplina'].forEach(function (k) {
        var b = document.getElementById('mx-sub-' + k); if (b) b.classList.toggle('active', k === g);
      });
      var c = document.getElementById('mx-cmp'); if (c) c.innerHTML = matchCmpHtml(_statIdx, g);
    }
    function statMatchPanel(i) {
      var m = teamMatches[i];
      if (!m) return '';
      var ps = teamMatchStats[m.fixture_id];
      var H = ps && ps.home, A = ps && ps.away;
      var esc = function (s) { return String(s == null ? '' : s).replace(/"/g, '&quot;'); };
      var fecha = m.fecha ? new Date(m.fecha).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
      var cL = (H && H.color) || '', cR = (A && A.color) || '';
      var styleVars = (cL ? '--mx-home:' + cL + ';' : '') + (cR ? '--mx-away:' + cR + ';' : '');

      var crest = function (logo, name) {
        return '<div class="team"><div class="crest"><img src="' + esc(logo) + '" onerror="this.style.visibility=\'hidden\'"></div>' +
          '<h1 class="team-name">' + name + '</h1></div>';
      };
      var hero = '<header class="hero"><div class="hero-inner">' +
        '<div class="match-meta"><span class="badge">' + currentComp.nombre + '</span>' +
          '<span class="badge">Temporada ' + teamSeason + '</span><span class="status-pill">Finalizado</span></div>' +
        '<div class="scoreboard">' + crest(m.local_logo, m.local_nombre) +
          '<div class="score-center"><div class="score"><span>' + (m.gol_local != null ? m.gol_local : '-') + '</span><span>-</span><span>' + (m.gol_visita != null ? m.gol_visita : '-') + '</span></div></div>' +
          crest(m.visita_logo, m.visita_nombre) + '</div>' +
        '<div class="venue-grid"><span>' + ico('calendario', 14) + ' ' + fecha + '</span></div>' +
      '</div></header>';

      if (!H || !A) return '<div class="mx" style="' + styleVars + '">' + hero + '<div class="mx-empty">Este partido aún no tiene estadísticas detalladas disponibles.</div></div>';

      var kpi = function (label, icon, h, a, suf, dec) {
        var hs = _pct(Number(h || 0), Number(a || 0));
        return '<article class="metric-card"><div class="metric-top"><span class="metric-label">' + label + '</span>' +
          '<span class="icon-shell">' + ico(icon, 15) + '</span></div>' +
          '<div class="metric-values"><div class="mini-team"><span>' + _short(m.local_nombre) + '</span><strong>' + _val(h, suf, dec) + '</strong></div>' +
          '<div class="balance-bar" style="--home-share:' + hs + '%"><i></i><i></i></div>' +
          '<div class="mini-team"><span>' + _short(m.visita_nombre) + '</span><strong>' + _val(a, suf, dec) + '</strong></div></div></article>';
      };
      var kpis = '<div class="summary-grid">' +
        kpi('xG', 'gol', H.xg, A.xg, '', 2) +
        kpi('Posesión', 'stats', H.posesion, A.posesion, '%', 0) +
        kpi('Remates', 'gol', H.tiros, A.tiros, '', 0) +
        kpi('Remates al arco', 'gol', H.tiros_arco, A.tiros_arco, '', 0) +
        kpi('Pases', 'asistencia', H.pases, A.pases, '', 0) +
        kpi('Precisión de pase', 'stats', H.pases_pct, A.pases_pct, '%', 0) +
      '</div>';

      var subs = [['resumen', 'Resumen'], ['ataque', 'Ataque'], ['pases', 'Pases'], ['defensa', 'Defensa'], ['disciplina', 'Disciplina']];
      var subtabs = '<div class="subtabs">' + subs.map(function (s) {
        return '<button class="subtab' + (s[0] === _matchSub ? ' active' : '') + '" id="mx-sub-' + s[0] + '" onclick="setMatchSubtab(\'' + s[0] + '\')">' + s[1] + '</button>';
      }).join('') + '</div>';
      var leg = (cL || cR) ? '<div class="mx-leg"><span><i style="background:' + (cL || '#8a9098') + '"></i>' + m.local_nombre + '</span>' +
        '<span><i style="background:' + (cR || '#8a9098') + '"></i>' + m.visita_nombre + '</span></div>' : '';

      return '<div class="mx" style="' + styleVars + '">' + hero +
        '<section class="section"><h2 class="section-title">Resumen del partido</h2>' +
          '<p class="section-kicker">Indicadores principales de ambos equipos.</p>' + kpis + '</section>' +
        subtabs + '<div class="cmp-panel"><div id="mx-cmp">' + matchCmpHtml(i, _matchSub) + '</div>' + leg + '</div></div>';
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
      var jugadores = '<div class="tm-canvas tm-canvas-pad"><div class="pp-title"><span class="pp-tico">' + TI.users + '</span>Jugadores (' + teamPlayers.length + ')</div>' +
        '<div class="card"><table><thead><tr><th>#</th><th class="team-col">Jugador</th><th>Pos</th><th>PJ</th><th>Goles</th><th>Asist.</th><th><span class="cd cd-y"></span></th><th><span class="cd cd-r"></span></th></tr></thead><tbody>' + rows + '</tbody></table></div></div>';

      /* ── ESTADÍSTICA = vista de partido (diseño premium .mx) con selector de toda la
         temporada (más antiguo izq → más reciente der), default el más reciente, flechas ‹ ›. ── */
      _statIdx = teamMatches.length ? teamMatches.length - 1 : 0;
      var estadisticas = teamMatches.length
        ? '<div class="ms-selbar">' +
            '<button class="ms-arrow" id="ms-prev" onclick="moveStatMatch(-1)" aria-label="Partido anterior">&lsaquo;</button>' +
            '<div class="ms-strip" id="ms-strip">' + statMatchChips() + '</div>' +
            '<button class="ms-arrow" id="ms-next" onclick="moveStatMatch(1)" aria-label="Partido siguiente" disabled>&rsaquo;</button>' +
          '</div>' +
          '<div id="ms-panel">' + statMatchPanel(_statIdx) + '</div>'
        : '<div class="tm-empty">Sin partidos disponibles.</div>';

      /* ── AVANZADA: sin contenido por ahora ── */
      var avanzadas = '<div class="tm-empty" style="padding:48px 16px;text-align:center;color:#8a9098">Próximamente.</div>';

      document.getElementById('team-view').innerHTML = hero +
        '<div class="cc-chips" id="team-chips" role="group" aria-label="Secciones del equipo">' +
          '<button class="cc-chip active" id="tchip-estadisticas" onclick="setTeamTab(\'estadisticas\')" aria-pressed="true">Estadística</button>' +
          '<button class="cc-chip" id="tchip-jugadores" onclick="setTeamTab(\'jugadores\')" aria-pressed="false">Jugadores</button>' +
          '<button class="cc-chip" id="tchip-avanzadas" onclick="setTeamTab(\'avanzadas\')" aria-pressed="false">Avanzada</button>' +
        '</div>' +
        '<div id="team-view-estadisticas">' + estadisticas + '</div>' +
        '<div id="team-view-jugadores" class="hidden">' + jugadores + '</div>' +
        '<div id="team-view-avanzadas" class="hidden">' + avanzadas + '</div>';

      /* al mostrar por defecto Estadística, centra el selector en el partido más reciente */
      setTimeout(function () { var a = document.getElementById('ms-chip-' + _statIdx); if (a && a.scrollIntoView) a.scrollIntoView({ inline: 'center', block: 'nearest' }); }, 40);

      animarBarras();
      animarContadores();
    }

    function setTeamTab(t) {
      ['estadisticas', 'jugadores', 'avanzadas'].forEach(function (k) {
        var chip = document.getElementById('tchip-' + k);
        if (chip) { chip.classList.toggle('active', k === t); chip.setAttribute('aria-pressed', String(k === t)); }
        var view = document.getElementById('team-view-' + k);
        if (view) view.classList.toggle('hidden', k !== t);
      });
      /* al abrir Estadísticas, desplaza el selector al partido activo (el más reciente) */
      if (t === 'estadisticas') {
        var activo = document.getElementById('ms-chip-' + _statIdx);
        if (activo && activo.scrollIntoView) activo.scrollIntoView({ inline: 'center', block: 'nearest' });
      }
    }

