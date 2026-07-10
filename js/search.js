/* SPORTLY360° · js/search.js — refactor transparente: mismo código, solo reorganizado (no cambia diseño ni comportamiento). */
    /* Buscador global: jugadores + equipos + competiciones (debounce, resultados limitados) */
    var dsResults = [], dsTimer;
    function cerrarBuscador() { var el = document.getElementById('ds-results'); if (el) el.classList.add('hidden'); }
    function dsBuscar(q) {
      clearTimeout(dsTimer); q = (q || '').trim();
      if (q.length < 2) { cerrarBuscador(); return; }
      dsTimer = setTimeout(function () { dsEjecutar(q); }, 250);
    }
    function compName(id) { var c = comps.find(function (x) { return x.id === id; }); return c ? c.nombre : id; }
    async function dsEjecutar(q) {
      var norm = q.toLowerCase();
      var cComp = comps.filter(function (c) { return c.nombre.toLowerCase().indexOf(norm) >= 0; })
        .map(function (c) { return { tipo: 'comp', id: c.id, nombre: c.nombre }; });
      var r = await Promise.all([
        sb.from('goleadores').select('jugador,competicion_id,temporada,equipo').ilike('jugador', '%' + q + '%').order('temporada', { ascending: false }).limit(20),
        sb.from('posiciones').select('equipo,competicion_id,temporada').ilike('equipo', '%' + q + '%').order('temporada', { ascending: false }).limit(20)
      ]);
      var vp = {}, players = [];
      (r[0].data || []).forEach(function (x) { if (!vp[x.jugador]) { vp[x.jugador] = 1; players.push({ tipo: 'player', jugador: x.jugador, cid: x.competicion_id, temp: x.temporada, equipo: x.equipo }); } });
      var vt = {}, teams = [];
      (r[1].data || []).forEach(function (x) { if (!vt[x.equipo]) { vt[x.equipo] = 1; teams.push({ tipo: 'team', equipo: x.equipo, cid: x.competicion_id, temp: x.temporada }); } });
      dsResults = cComp.slice(0, 4).concat(teams.slice(0, 5)).concat(players.slice(0, 6));
      dsRender();
    }
    function dsRender() {
      var el = document.getElementById('ds-results');
      if (!el) return;
      if (!dsResults.length) { el.innerHTML = '<div class="ds-empty">Sin resultados</div>'; el.classList.remove('hidden'); return; }
      el.innerHTML = dsResults.map(function (r, i) {
        var ico, nom, ctx;
        if (r.tipo === 'comp') { ico = DICO.grid; nom = r.nombre; ctx = 'Competición'; }
        else if (r.tipo === 'team') { ico = DICO.shield; nom = r.equipo; ctx = compName(r.cid); }
        else { ico = DICO.user; nom = r.jugador; ctx = (r.equipo ? r.equipo + ' · ' : '') + compName(r.cid); }
        return '<div class="ds-item" onmousedown="dsGo(' + i + ')"><span class="ds-i">' + dico(ico, 17) + '</span><span class="ds-n">' + nom + '</span><span class="ds-c">' + ctx + '</span></div>';
      }).join('');
      el.classList.remove('hidden');
    }
    function dsGo(i) {
      var r = dsResults[i]; if (!r) return; cerrarBuscador();
      if (r.tipo === 'comp') selectComp(r.id);
      else if (r.tipo === 'team') abrirEquipo(r.cid, r.temp, r.equipo);
      else abrirJugador(r.cid, r.temp, r.jugador);
    }
    /* Abrir equipo/jugador desde el buscador o favoritos (fija competición + temporada) */
    function abrirEquipo(cid, temp, equipo) {
      enHome = false; currentId = cid; currentComp = comps.find(function (c) { return c.id === cid; });
      currentSeason = temp; seasonSel[cid] = temp; teamFrom = 'home';
      loadTeam(equipo, temp);
    }
    function abrirJugador(cid, temp, jugador) {
      enHome = false; currentId = cid; currentComp = comps.find(function (c) { return c.id === cid; });
      currentSeason = temp; seasonSel[cid] = temp; playerFrom = 'home';
      loadPlayer(jugador, temp);
    }

    /* Competition Center (v2.1): 4 secciones vía chips */
    function setTab(t) {
      tab = t;
      ['stats', 'tabla', 'gol', 'asis'].forEach(function (k) {
        var c = document.getElementById('chip-' + k);
        if (c) { c.classList.toggle('active', t === k); c.setAttribute('aria-pressed', String(t === k)); }
        document.getElementById('view-' + k).classList.toggle('hidden', t !== k);
      });
    }

