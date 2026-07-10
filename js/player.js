/* SPORTLY360° · js/player.js — refactor transparente: mismo código, solo reorganizado (no cambia diseño ni comportamiento). */
    /* ═══ VISTA DE JUGADOR (Info general / Estadísticas) ═══ */
    var playerName = null, playerSeason = null, playerRow = null, playerFrom = 'comp';

    function verJugador(nombre, from) {
      playerFrom = from || 'comp';
      loadPlayer(nombre, playerFrom === 'team' ? teamSeason : currentSeason);
    }
    function cambiarTempJugador(s) { loadPlayer(playerName, s); }

    async function loadPlayer(nombre, season) {
      pushHist();                       /* v2.0: historial en memoria */
      playerName = nombre; playerSeason = season;
      olvidarScroll('player-view');
      mostrar('player-view');
      setCrumbs('player', [{ label: 'Inicio', act: 'home' }, { label: currentComp.nombre, act: 'comp' }]
        .concat(playerFrom === 'team' && teamRow ? [{ label: teamRow.equipo, act: 'team' }] : [])
        .concat([{ label: nombre }]));
      document.getElementById('player-view').innerHTML = skelPerfil();
      var r = await sb.from('plantilla').select('*').eq('competicion_id', currentId).eq('temporada', season).eq('jugador', nombre).limit(1);
      playerRow = (r.data || [])[0] || { jugador: nombre, goles: 0, asistencias: 0, foto: '', equipo: (teamRow ? teamRow.equipo : '') };
      renderPlayer();
    }

    /* ── Íconos SVG (reutilizables, de línea) ── */
    function ppSvg(p) { return '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + p + '</svg>'; }
    var PPICO = {
      info: ppSvg('<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>'),
      ofe:  ppSvg('<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>'),
      cre:  ppSvg('<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>'),
      def:  ppSvg('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>'),
      dis:  ppSvg('<rect x="6" y="3" width="12" height="18" rx="2"/>'),
      part: ppSvg('<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>'),
      rend: ppSvg('<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>')
    };

    /* ── Valores con contador animado (SOLO perfil de jugador; no toca el nd() global) ── */
    function pv(v, dec, suf) {
      if (v === null || v === undefined || v === '' || !isFinite(Number(v))) return '<span class="nd">Sin datos</span>';
      return '<span class="pp-num" data-to="' + Number(v) + '" data-dec="' + (dec || 0) + '" data-suf="' + (suf || '') + '">0' + (suf || '') + '</span>';
    }
    function pvCard(v, cls) {  // amarillas/rojas: color + contador
      if (v === null || v === undefined) return '<span class="nd">Sin datos</span>';
      return '<span class="' + cls + '"><span class="pp-num" data-to="' + Number(v) + '" data-dec="0" data-suf="">0</span></span>';
    }

    /* ── Tarjeta (icono + descripción + barra) y sección (recibe specs) ── */
    var _ppI = 0;
    function ppStat(label, value, opts) {
      opts = opts || {};
      var d = Math.min(_ppI++ * 22, 520);
      var ico = opts.ico ? '<span class="pp-cico">' + opts.ico + '</span>' : '';
      var desc = opts.desc ? '<div class="pp-desc">' + opts.desc + '</div>' : '';
      var bar = (opts.bar !== null && opts.bar !== undefined && isFinite(opts.bar))
        ? '<div class="pp-bar"><span data-w="' + Math.max(0, Math.min(100, Math.round(opts.bar))) + '"></span></div>' : '';
      return '<div class="pp-card" style="animation-delay:' + d + 'ms">' + ico + '<div class="pp-v">' + value + '</div><div class="pp-k">' + label + '</div>' + desc + bar + '</div>';
    }
    function ppSection(ico, title, specs) {  // specs: [ [label, value, opts?], ... ]
      var cards = specs.map(function (s) { return ppStat(s[0], s[1], s[2] || {}); }).join('');
      return '<div class="pp-title"><span class="pp-tico">' + ico + '</span>' + title + '</div><div class="pp-grid">' + cards + '</div>';
    }

    /* ── Animaciones (barras + contadores) ── */
    function animarBarras() {
      setTimeout(function () {
        document.querySelectorAll('#player-view .pp-bar > span[data-w], #team-view .pp-bar > span[data-w]').forEach(function (s) { s.style.width = s.getAttribute('data-w') + '%'; });
      }, 60);
    }
    function animarContadores() {
      document.querySelectorAll('#player-view .pp-num, #team-view .pp-num').forEach(function (el) {
        var to = parseFloat(el.getAttribute('data-to')), dec = parseInt(el.getAttribute('data-dec')) || 0, suf = el.getAttribute('data-suf') || '', ini = null;
        function step(ts) {
          if (!ini) ini = ts;
          var t = Math.min(1, (ts - ini) / 700), val = to * (1 - Math.pow(1 - t, 3));
          el.textContent = (dec ? val.toFixed(dec) : Math.round(val)) + suf;
          if (t < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
      });
    }

    /* ── Radar SVG puro (5 categorías, tema negro + lima; "Sin datos" si falta info) ── */
    function radarSvg(cats) {
      var keys = Object.keys(cats);
      if (keys.every(function (k) { return cats[k] == null; }))
        return '<div class="pp-radar-card"><div class="pp-radar-empty">Sin datos suficientes para el radar</div></div>';
      var cx = 140, cy = 120, R = 82, N = keys.length;
      function pt(i, r) { var a = -Math.PI / 2 + i * 2 * Math.PI / N; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; }
      var rings = [0.25, 0.5, 0.75, 1].map(function (f) {
        return '<polygon points="' + keys.map(function (_, i) { var q = pt(i, R * f); return q[0].toFixed(1) + ',' + q[1].toFixed(1); }).join(' ') + '" fill="none" stroke="rgba(255,255,255,.12)"/>';
      }).join('');
      var axes = keys.map(function (_, i) { var q = pt(i, R); return '<line x1="' + cx + '" y1="' + cy + '" x2="' + q[0].toFixed(1) + '" y2="' + q[1].toFixed(1) + '" stroke="rgba(255,255,255,.12)"/>'; }).join('');
      var poly = keys.map(function (k, i) { var v = cats[k] == null ? 0 : cats[k]; var q = pt(i, R * v / 100); return q[0].toFixed(1) + ',' + q[1].toFixed(1); }).join(' ');
      var dots = keys.map(function (k, i) { var v = cats[k] == null ? 0 : cats[k]; var q = pt(i, R * v / 100); return '<circle cx="' + q[0].toFixed(1) + '" cy="' + q[1].toFixed(1) + '" r="3" fill="#c6ff00"/>'; }).join('');
      var labels = keys.map(function (k, i) {
        var q = pt(i, R + 16), anchor = Math.abs(q[0] - cx) < 6 ? 'middle' : (q[0] > cx ? 'start' : 'end'), muted = cats[k] == null;
        return '<text x="' + q[0].toFixed(1) + '" y="' + (q[1] + 4).toFixed(1) + '" text-anchor="' + anchor + '" font-size="11" font-weight="700" fill="' + (muted ? 'rgba(255,255,255,.4)' : '#fff') + '">' + (muted ? 'Sin datos' : k) + '</text>';
      }).join('');
      return '<div class="pp-radar-card"><svg viewBox="-30 0 340 255">' + rings + axes +
        '<polygon points="' + poly + '" fill="rgba(198,255,0,.22)" stroke="#c6ff00" stroke-width="2" stroke-linejoin="round"/>' + dots + labels + '</svg></div>';
    }

    /* ── Perfil de jugador PREMIUM ── */
    var posLabelFull = { Goalkeeper: 'Portero', Defender: 'Defensa', Midfielder: 'Mediocampista', Attacker: 'Delantero' };
    function renderPlayer() {
      _ppI = 0;
      var p = playerRow;
      var g = p.goles, a = p.asistencias, min = p.minutos, pj = p.partidos, tit = p.titular, ti = p.tiros, ta = p.tiros_arco;
      var sup = (pj != null && tit != null) ? (pj - tit) : null;
      var prec = (p.precision_pase != null) ? Number(p.precision_pase) : null;

      /* Métricas derivadas (solo con datos ya cargados; null si falta el denominador) */
      var rat = function (x, y, d) { return (x != null && y) ? Number((x / y).toFixed(d == null ? 2 : d)) : null; };
      var golPP = rat(g, pj), asisPP = rat(a, pj), tiPP = rat(ti, pj), taPP = rat(ta, pj);
      var gol90 = (g != null && min) ? Number((g / (min / 90)).toFixed(2)) : null;
      var minGol = (g && min != null) ? Math.round(min / g) : null;
      var ga = (g != null && a != null) ? (g + a) : null;
      var conv = (g != null && ti) ? Math.round(g / ti * 100) : null;
      var titPct = (tit != null && pj) ? Math.round(tit / pj * 100) : null;
      var arcoPct = (ta != null && ti) ? Math.round(ta / ti * 100) : null;

      /* Radar: 5 categorías normalizadas contra topes fijos (dato real, documentado) */
      var pct = function (v, cap) { return v == null ? null : Math.max(0, Math.min(100, v / cap * 100)); };
      var avgN = function (arr) { var f = arr.filter(function (x) { return x != null; }); return f.length ? Math.round(f.reduce(function (s, x) { return s + x; }, 0) / f.length) : null; };
      var cats = {
        'Ataque': avgN([pct(g, 20), pct(ta, 50)]),
        'Creación': avgN([pct(a, 15), pct(p.pases_clave, 70)]),
        'Defensa': avgN([pct(p.tackles, 80), pct(p.intercepciones, 60), pct(p.duelos_gan, 150)]),
        'Disciplina': (p.amarillas != null || p.rojas != null) ? Math.round(Math.max(0, 100 - pct((p.amarillas || 0) * 12 + (p.rojas || 0) * 40, 100))) : null,
        'Participación': (pct(min, 3400) == null) ? null : Math.round(pct(min, 3400))
      };

      /* Hero: foto + nombre + equipo/liga/temporada + rating destacado + G/A */
      var hstat = function (v, k, cls) { return '<div class="pp-hstat' + (cls || '') + '"><div class="v">' + v + '</div><div class="k">' + k + '</div></div>'; };
      var hero =
        '<div class="pp-hero">' +
          '<div class="pp-photo">' + avatar(p.jugador, p.foto) + '</div>' +
          '<div class="pp-hero-info">' +
            '<div class="pp-name">' + p.jugador + '</div>' +
            '<div class="pp-team">' + (p.team_logo ? '<img src="' + p.team_logo + '" onerror="this.style.display=\'none\'">' : '') +
              (p.equipo || '') + ' &middot; ' + currentComp.nombre + ' &middot; ' + playerSeason + '</div>' +
            (p.posicion || p.lesionado ? '<div class="pp-chips">' +
              (p.posicion ? '<span class="pp-chip">' + (posLabelFull[p.posicion] || p.posicion) + '</span>' : '') +
              (p.lesionado ? '<span class="pp-chip pp-chip-injured">Lesionado</span>' : '') +
            '</div>' : '') +
            '<div class="pp-hero-stats">' +
              hstat(p.rating != null ? Number(p.rating).toFixed(1) : '&ndash;', 'Rating', ' pp-rating') +
              hstat(g != null ? g : '&ndash;', 'Goles') +
              hstat(a != null ? a : '&ndash;', 'Asist.') +
            '</div>' +
          '</div>' +
          star('jugador', currentId + '|' + playerSeason + '|' + p.jugador, p.jugador, { foto: p.foto, comp: currentComp.nombre, cid: currentId, temp: playerSeason }) +
          '<div class="season-nav">' + seasonNavInner(playerSeason, 'cambiarTempJugador') + '</div>' +
        '</div>';

      document.getElementById('player-view').innerHTML = hero +
        radarSvg(cats) +
        ppSection(PPICO.rend, 'Rendimiento', [
          ['Goles/partido', pv(golPP, 2)], ['Goles/90 min', pv(gol90, 2)], ['Asist./partido', pv(asisPP, 2)], ['Min./gol', pv(minGol)],
          ['Participación G+A', pv(ga)], ['Conversión de tiros', pv(conv, 0, '%'), { bar: conv, desc: 'goles / tiros' }],
          ['Tiros/partido', pv(tiPP, 2)], ['Tiros al arco/partido', pv(taPP, 2)], ['% titularidades', pv(titPct, 0, '%'), { bar: titPct }]
        ]) +
        ppSection(PPICO.info, 'Información general', [
          ['Posición', nd(posLabelFull[p.posicion] || p.posicion)], ['Nacionalidad', nd(p.nacionalidad)], ['Edad', nd(p.edad)],
          ['F. nacimiento', nd(p.fecha_nacimiento ? new Date(p.fecha_nacimiento + 'T00:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' }) : null)],
          ['Altura', p.altura ? p.altura + ' cm' : nd(null)], ['Peso', p.peso ? p.peso + ' kg' : nd(null)], ['Pie dominante', nd(null)], ['Dorsal', nd(p.dorsal)], ['Valor de mercado', nd(null)]
        ]) +
        ppSection(PPICO.ofe, 'Ofensivas', [
          ['Goles', pv(g)], ['Asistencias', pv(a)], ['xG', nd(null)], ['xA', nd(null)],
          ['Tiros', pv(ti)], ['Tiros al arco', pv(ta), { bar: arcoPct, desc: arcoPct != null ? arcoPct + '% de los tiros' : '' }], ['Grandes ocasiones', nd(null)]
        ]) +
        ppSection(PPICO.cre, 'Creación', [
          ['Pases completados', pv(p.pases)], ['Precisión de pase', pv(prec, 0, '%'), { bar: prec }], ['Centros', nd(null)],
          ['Pases clave', pv(p.pases_clave)], ['Ocasiones creadas', nd(null)]
        ]) +
        ppSection(PPICO.def, 'Defensivas', [
          ['Entradas', pv(p.tackles)], ['Intercepciones', pv(p.intercepciones)], ['Recuperaciones', nd(null)],
          ['Duelos ganados', pv(p.duelos_gan)], ['Balones recuperados', nd(null)]
        ]) +
        ppSection(PPICO.dis, 'Disciplina', [
          ['Amarillas', pvCard(p.amarillas, 'c-yellow')], ['Rojas', pvCard(p.rojas, 'c-red')],
          ['Faltas cometidas', pv(p.faltas_com)], ['Faltas recibidas', pv(p.faltas_rec)]
        ]) +
        ppSection(PPICO.part, 'Participación', [
          ['Partidos', pv(pj)], ['Titularidades', pv(tit), { bar: titPct }], ['Suplencias', pv(sup)], ['Minutos', pv(min)]
        ]) +
        '<div class="tv-note" style="margin-top:22px">Datos reales de la temporada (API-Football) y métricas derivadas calculadas. Los campos "Sin datos" (perfil personal, xG/xA, centros…) quedan listos para futuras integraciones.</div>';

      animarBarras();
      animarContadores();
    }

