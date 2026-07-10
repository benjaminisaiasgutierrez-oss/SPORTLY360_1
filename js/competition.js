/* SPORTLY360° · js/competition.js — refactor transparente: mismo código, solo reorganizado (no cambia diseño ni comportamiento). */
    /* ═══ COMPETITION CENTER (v2.1) ═══ */
    /* Hero premium (reutiliza .pp-hero) + chips de navegación (iconos de icons.js) */
    function renderCompHero() {
      var c = currentComp;
      var seasons = Object.keys(seasonsMap[c.id] || {}).sort().reverse();
      var estado = currentSeason === seasons[0] ? 'Temporada m&aacute;s reciente' : 'Temporada hist&oacute;rica';
      var tipo = c.tipo === 'cup' ? 'Copa UEFA' : 'Liga';
      document.getElementById('cc-hero').innerHTML =
        '<div class="pp-hero">' +
          '<div class="pp-photo pp-crest"><img src="' + c.logo + '" alt="" onerror="this.style.visibility=\'hidden\'"></div>' +
          '<div class="pp-hero-info">' +
            '<div class="pp-name">' + c.nombre + '</div>' +
            '<div class="pp-team">' + c.pais + ' &middot; Temporada ' + currentSeason + '</div>' +
            '<div class="pp-chips"><span class="pp-chip">' + tipo + '</span><span class="pp-chip">' + estado + '</span></div>' +
          '</div>' +
          star('competicion', c.id, c.nombre, { logo: c.logo, cid: c.id }) +
          '<div class="season-nav">' + seasonNavInner(currentSeason, 'cambiarTemporada') + '</div>' +
        '</div>';
      var chips = [['stats', 'stats', 'Estad&iacute;sticas'], ['tabla', 'trofeo', 'Tabla'], ['gol', 'gol', 'Goleadores'], ['asis', 'asistencia', 'Asistencias']];
      document.getElementById('cc-chips').innerHTML = chips.map(function (ch) {
        return '<button class="cc-chip" id="chip-' + ch[0] + '" onclick="setTab(\'' + ch[0] + '\')" aria-pressed="false">' +
          '<span class="cc-ci">' + ico(ch[1], 16) + '</span>' + ch[2] + '</button>';
      }).join('');
      document.getElementById('cc-si').innerHTML = ico('buscar', 15);
      setTab(tab);   /* marca chip activo y muestra la sección vigente */
    }

    /* ── Cargar tabla + goleadores + stats de equipo de la competición/temporada ── */
    async function loadData() {
      var c = currentComp;
      compViewKey = currentId + '|' + currentSeason;   /* v2.0: contenido vigente de comp-view */
      olvidarScroll('comp-view');                       /* carga nueva → arriba */
      mostrar('comp-view');
      setCrumbs('comp', [{ label: 'Inicio', act: 'home' }, { label: c.nombre }]);
      renderCompHero();
      document.getElementById('gol-filter').value = '';
      document.getElementById('cc-stats').innerHTML = skelLista(6);
      document.getElementById('tabla-cont').innerHTML = skelLista(10);
      document.getElementById('scorers').innerHTML = skelLista(8);
      document.getElementById('assists').innerHTML = skelLista(8);

      var r = await Promise.all([
        sb.from('posiciones').select('*')
          .eq('competicion_id', currentId).eq('temporada', currentSeason)
          .order('grupo').order('rank'),
        sb.from('goleadores').select('*')
          .eq('competicion_id', currentId).eq('temporada', currentSeason)
          .order('rank'),
        sb.from('equipo_stats').select('porterias,amarillas,rojas')
          .eq('competicion_id', currentId).eq('temporada', currentSeason)
      ]);
      currentGol = r[1].data || [];
      renderTabla(c, r[0].data || []);
      renderScorers(currentGol);
      renderCCStats(r[0].data || [], r[2].data || []);
      renderAsistencias(currentGol);
    }

    /* ── Estadísticas de la competición (solo datos reales; "Sin datos" si falta) ── */
    function renderCCStats(pos, es) {
      var cont = document.getElementById('cc-stats');
      if (!pos.length) { cont.innerHTML = emptyState('vacio', 'Sin estad&iacute;sticas', 'No hay datos para esta temporada. Prueba con otra temporada.'); return; }
      var partidos = Math.round(pos.reduce(function (a, t) { return a + (t.played || 0); }, 0) / 2);
      var goles = pos.reduce(function (a, t) { return a + (t.gf || 0); }, 0);
      var prom = partidos ? (goles / partidos).toFixed(2) : null;
      var grupos = {}; pos.forEach(function (t) { grupos[t.grupo || ''] = 1; });
      var single = Object.keys(grupos).length === 1;
      var lider = single ? pos.find(function (t) { return t.rank === 1; }) : null;   /* con grupos no hay líder único */
      var ataque = pos.slice().sort(function (a, b) { return (b.gf || 0) - (a.gf || 0); })[0];
      var defensa = pos.slice().sort(function (a, b) { return (a.ga || 0) - (b.ga || 0); })[0];
      var sumNull = function (arr, k) {   /* suma solo si hay datos; si no, null → "Sin datos" */
        var has = false, s = 0;
        arr.forEach(function (x) { if (x[k] != null) { has = true; s += x[k]; } });
        return has ? s : null;
      };
      var porterias = sumNull(es, 'porterias'), amarillas = sumNull(es, 'amarillas'), rojas = sumNull(es, 'rojas');
      var goleador = currentGol.length ? currentGol[0] : null;

      /* Destacado clickable → abre el perfil (reutiliza .adv-item + verEquipo/verJugador) */
      function filaEq(icon, label, t, dato) {
        if (!t) return '<div class="adv-item pend"><span class="adv-ico">' + ico(icon, 17) + '</span><span class="adv-name">' + label + '</span><span class="adv-val nd">Sin datos</span></div>';
        var eq = (t.equipo || '').replace(/"/g, '&quot;');
        return '<div class="adv-item cc-lead" data-eq="' + eq + '" onclick="verEquipo(this.dataset.eq)" role="button" tabindex="0" onkeydown="navKey(event)">' +
          '<span class="adv-ico">' + ico(icon, 17) + '</span><span class="adv-name">' + label + '</span>' +
          '<img class="cc-lead-logo" src="' + (t.logo || '') + '" alt="" onerror="this.style.visibility=\'hidden\'">' +
          '<span class="adv-val">' + t.equipo + '</span><span class="cc-lead-dato">' + dato + '</span></div>';
      }
      var filaGol = !goleador
        ? '<div class="adv-item pend"><span class="adv-ico">' + ico('gol', 17) + '</span><span class="adv-name">M&aacute;ximo goleador</span><span class="adv-val nd">Sin datos</span></div>'
        : '<div class="adv-item cc-lead" data-pl="' + (goleador.jugador || '').replace(/"/g, '&quot;') + '" onclick="verJugador(this.dataset.pl, \'comp\')" role="button" tabindex="0" onkeydown="navKey(event)">' +
            '<span class="adv-ico">' + ico('gol', 17) + '</span><span class="adv-name">M&aacute;ximo goleador</span>' +
            '<span class="adv-val">' + goleador.jugador + '</span><span class="cc-lead-dato">' + goleador.goles + ' goles</span></div>';

      cont.innerHTML =
        '<div class="pp-title"><span class="pp-tico">' + ico('stats', 16) + '</span>Resumen de la temporada</div>' +
        '<div class="tv-grid">' +
          box('Equipos', pos.length) +
          box('Partidos jugados', nd(partidos || null), !partidos) +
          box('Goles', nd(goles || null), !goles) +
          box('Prom. goles / partido', nd(prom), prom == null) +
          box('Porter&iacute;as imbatidas', nd(porterias), porterias == null) +
          box('Tarjetas amarillas', nd(amarillas), amarillas == null) +
          box('Tarjetas rojas', nd(rojas), rojas == null) +
          box('Temporadas en SPORTLY', Object.keys(seasonsMap[currentId] || {}).length) +
        '</div>' +
        '<div class="pp-title"><span class="pp-tico">' + ico('trofeo', 16) + '</span>Destacados</div>' +
        '<div class="adv-list">' +
          filaEq('trofeo', 'L&iacute;der', lider, lider ? lider.points + ' pts' : '') +
          filaEq('gol', 'Mejor ataque', ataque, ataque ? ataque.gf + ' goles' : '') +
          filaEq('equipo', 'Mejor defensa', defensa, defensa ? defensa.ga + ' GC' : '') +
          filaGol +
        '</div>';
    }

    /* ── Buscador local de goleadores (filtra la lista ya cargada; sin consultas) ── */
    function filtrarGoleadores(q) {
      q = (q || '').trim().toLowerCase();
      var list = !q ? currentGol : currentGol.filter(function (p) {
        return (p.jugador || '').toLowerCase().indexOf(q) >= 0 || (p.equipo || '').toLowerCase().indexOf(q) >= 0;
      });
      if (!list.length && q) { document.getElementById('scorers').innerHTML = emptyState('buscar', 'Sin resultados', 'Ning&uacute;n goleador coincide con tu b&uacute;squeda.'); return; }
      renderScorers(list);
    }

    /* ── Ranking de asistencias (datos reales de la tabla goleadores; nunca inventa) ── */
    function renderAsistencias(gol) {
      var cont = document.getElementById('assists');
      var list = (gol || []).filter(function (p) { return p.asistencias != null && p.asistencias > 0; })
        .sort(function (a, b) { return (b.asistencias - a.asistencias) || ((b.goles || 0) - (a.goles || 0)); });
      if (!list.length) {
        cont.innerHTML = emptyState('asistencia', 'Sin datos de asistencias', 'No hay asistencias registradas para esta temporada.');
        return;
      }
      cont.innerHTML = '<div class="card">' + list.map(function (p, i) {
        var eq = (p.jugador || '').replace(/"/g, '&quot;');
        return '<div class="scorer clickable' + (i < 3 ? ' top' : '') + '" data-pl="' + eq + '" onclick="verJugador(this.dataset.pl, \'comp\')">' +
          '<div class="rk">' + (i + 1) + '</div>' +
          avatar(p.jugador, p.foto) +
          '<div class="info"><div class="nm">' + p.jugador + '</div>' +
          '<div class="tm"><img src="' + (p.team_logo || '') + '" alt="" onerror="this.style.display=\'none\'">' + p.equipo + '</div></div>' +
          '<div class="ast"><b>' + (p.goles || 0) + '</b>goles</div>' +
          '<div class="stat"><div class="goals">' + p.asistencias + '</div><div class="goals-l">asist.</div></div>' +
        '</div>';
      }).join('') + '</div>' +
      '<div class="tv-note" style="margin-top:14px">Asistencias registradas entre los m&aacute;ximos goleadores de la temporada (la API gratuita no publica el ranking completo de asistencias).</div>';
    }

    /* ── Zona de clasificación ── */
    function zoneClass(comp, rank, total, grouped) {
      if (grouped) {                     /* fase de grupos (4 equipos) */
        if (rank <= 2) return 'z-champ';
        if (rank === 3) return 'z-eur';
        return 'z-rel';
      }
      if (comp.tipo === 'cup') {          /* fase liga (36 equipos) */
        if (rank <= 8) return 'z-champ';
        if (rank <= 24) return 'z-eur';
        return 'z-rel';
      }
      if (rank <= 4) return 'z-champ';    /* liga */
      if (rank <= 6) return 'z-eur';
      if (rank > total - 3) return 'z-rel';
      return '';
    }

    function legendFor(comp, grouped) {
      var el = document.getElementById('legend');
      if (grouped) {
        el.innerHTML =
          '<span><i style="background:var(--accent)"></i> Avanzan (1-2)</span>' +
          '<span><i style="background:#2979ff"></i> 3&deg; a Europa League</span>' +
          '<span><i style="background:#e53935"></i> Eliminado</span>';
      } else if (comp.tipo === 'cup') {
        el.innerHTML =
          '<span><i style="background:var(--accent)"></i> Octavos (1-8)</span>' +
          '<span><i style="background:#2979ff"></i> Playoff (9-24)</span>' +
          '<span><i style="background:#e53935"></i> Eliminado (25-36)</span>';
      } else {
        el.innerHTML =
          '<span><i style="background:var(--accent)"></i> Champions (1-4)</span>' +
          '<span><i style="background:#2979ff"></i> Europa (5-6)</span>' +
          '<span><i style="background:#e53935"></i> Descenso</span>';
      }
    }

    function avatar(name, photo) {
      var parts = (name || '?').trim().split(/\s+/);
      var ini = (parts[0].charAt(0) + (parts.length > 1 ? parts[parts.length - 1].charAt(0) : '')).toUpperCase();
      var h = 0; for (var i = 0; i < name.length; i++) h = (h + name.charCodeAt(i)) % 360;
      var init = '<span class="ph-init" style="background:hsl(' + h + ',45%,32%)">' + ini + '</span>';
      var img = photo ? '<img class="ph" src="' + photo + '" alt="" onerror="this.remove()">' : '';
      return '<div class="ph-wrap">' + init + img + '</div>';
    }

    function formHtml(form) {
      if (!form) return '<span class="dim">&ndash;</span>';
      var last5 = form.slice(-5).split('');
      return '<div class="form-row">' + last5.map(function(r) {
        return '<div class="form-dot f-' + r + '">' + r + '</div>';
      }).join('') + '</div>';
    }

    function filaHtml(comp, t, total, grouped) {
      var z = zoneClass(comp, t.rank, total, grouped);
      var eq = (t.equipo || '').replace(/"/g, '&quot;');
      return '<tr class="team-row" data-eq="' + eq + '" onclick="verEquipo(this.dataset.eq)">' +
        '<td class="pos ' + z + '">' + t.rank + '</td>' +
        '<td><div class="team-cell"><img src="' + (t.logo || '') + '" alt="" onerror="this.style.visibility=\'hidden\'"><span>' + t.equipo + '</span></div></td>' +
        '<td class="dim">' + t.played + '</td>' +
        '<td class="hide-m">' + t.win + '</td><td class="hide-m">' + t.draw + '</td><td class="hide-m">' + t.lose + '</td>' +
        '<td class="hide-m dim">' + t.gf + '</td><td class="hide-m dim">' + t.ga + '</td>' +
        '<td>' + (t.gd > 0 ? '+' + t.gd : t.gd) + '</td>' +
        '<td class="pts">' + t.points + '</td>' +
        '<td class="hide-m">' + formHtml(t.form) + '</td>' +
      '</tr>';
    }

    function tablaCard(comp, rows, total, grouped) {
      var head = '<div class="card"><table><thead><tr>' +
        '<th>#</th><th class="team-col">Equipo</th><th>PJ</th>' +
        '<th class="hide-m">G</th><th class="hide-m">E</th><th class="hide-m">P</th>' +
        '<th class="hide-m">GF</th><th class="hide-m">GC</th><th>DG</th><th>Pts</th>' +
        '<th class="hide-m">&Uacute;ltimos 5</th></tr></thead><tbody>';
      var body = rows.map(function(t) { return filaHtml(comp, t, total, grouped); }).join('');
      return head + body + '</tbody></table></div>';
    }

    function renderTabla(comp, posiciones) {
      currentPosList = posiciones;
      var cont = document.getElementById('tabla-cont');
      if (!posiciones.length) {
        cont.innerHTML = emptyState('vacio', 'Sin tabla de posiciones', 'No hay datos de clasificación para esta temporada. Prueba con otra temporada.');
        document.getElementById('legend').innerHTML = '';
        return;
      }
      var groups = {}, order = [];
      posiciones.forEach(function(r) {
        var g = r.grupo || '';
        if (!(g in groups)) { groups[g] = []; order.push(g); }
        groups[g].push(r);
      });
      var grouped = order.filter(function(g) { return g; }).length > 1;
      var html = '';
      if (grouped) {
        order.sort();
        order.forEach(function(g) {
          var rows = groups[g].slice().sort(function(a, b) { return a.rank - b.rank; });
          html += '<div class="group-title">' + g.replace('Group', 'Grupo') + '</div>' +
                  tablaCard(comp, rows, rows.length, true);
        });
      } else {
        var rows = posiciones.slice().sort(function(a, b) { return a.rank - b.rank; });
        html += tablaCard(comp, rows, rows.length, false);
      }
      cont.innerHTML = html;
      legendFor(comp, grouped);
    }

    function renderScorers(goleadores) {
      var sc = goleadores.map(function(p) {
        var eq = (p.jugador || '').replace(/"/g, '&quot;');
        return '<div class="scorer clickable' + (p.rank <= 3 ? ' top' : '') + '" data-pl="' + eq + '" onclick="verJugador(this.dataset.pl, \'comp\')">' +
          '<div class="rk">' + p.rank + '</div>' +
          avatar(p.jugador, p.foto) +
          '<div class="info"><div class="nm">' + p.jugador + '</div>' +
          '<div class="tm"><img src="' + (p.team_logo || '') + '" alt="" onerror="this.style.display=\'none\'">' + p.equipo + '</div></div>' +
          '<div class="ast"><b>' + (p.asistencias || 0) + '</b>asist.</div>' +
          '<div class="stat"><div class="goals">' + p.goles + '</div><div class="goals-l">goles</div></div>' +
        '</div>';
      }).join('');
      document.getElementById('scorers').innerHTML = sc || emptyState('vacio', 'Sin goleadores', 'No hay datos de goleadores para esta temporada.');
    }

