/* SPORTLY360° · js/ui.js — refactor transparente: mismo código, solo reorganizado (no cambia diseño ni comportamiento). */
    /* ═══ NAVEGACIÓN ENTRE VISTAS ═══ */
    function normTeam(s) { return (s || '').toLowerCase().normalize('NFD').replace(/[^a-z]/g, ''); }
    /* Navegador de temporada: 1 visible + flechas ‹ › */
    function seasonNavInner(sel, fn) {
      var seasons = Object.keys(seasonsMap[currentId] || {}).sort().reverse();
      var i = seasons.indexOf(sel); if (i < 0) i = 0;
      var newer = seasons[i - 1], older = seasons[i + 1];
      function arrow(chr, target) {
        var lbl = chr === '&lsaquo;' ? 'Temporada anterior' : 'Temporada siguiente';
        return '<button class="sp-nav" aria-label="' + lbl + '"' + (target ? ' onclick="' + fn + '(\'' + target + '\')"' : ' disabled') + '>' + chr + '</button>';
      }
      return arrow('&lsaquo;', newer) + '<span class="sp-current">' + sel + '</span>' + arrow('&rsaquo;', older);
    }
    function box(k, v, pend) { return '<div class="tv-stat' + (pend ? ' pend' : '') + '"><div class="tv-v">' + v + '</div><div class="tv-k">' + k + '</div></div>'; }
    /* Muestra el valor real o "Sin datos" si es null/undefined (nunca inventa) */
    function nd(v, suf) { return (v === null || v === undefined || v === '') ? '<span class="nd">Sin datos</span>' : (v + (suf || '')); }
    function ndCard(v, cls) { return (v === null || v === undefined) ? '<span class="nd">Sin datos</span>' : '<span class="' + cls + '">' + v + '</span>'; }
    /* v2.0: memoria de scroll POR VISTA — al volver a una vista que sigue en el DOM
       se restaura la posición exacta; una recarga de datos la invalida (olvidarScroll). */
    var _scrollMem = {};
    function olvidarScroll(id) { delete _scrollMem[id]; }
    function mostrar(id) {
      var vistas = ['home-view', 'comp-view', 'team-view', 'player-view', 'settings-view'];
      var actual = vistas.filter(function(v) { return !document.getElementById(v).classList.contains('hidden'); })[0];
      if (actual && actual !== id) _scrollMem[actual] = window.scrollY;   /* guarda al salir */
      vistas.forEach(function(v) {
        document.getElementById(v).classList.toggle('hidden', v !== id);
      });
      document.querySelector('.panel').classList.toggle('panel-home', id === 'home-view' || id === 'settings-view');   /* Inicio y Configuración: panel oscuro */
      if (_scrollMem[id] != null) window.scrollTo({ top: _scrollMem[id], behavior: 'auto' });   /* restaura */
      else window.scrollTo({ top: 0, behavior: 'smooth' });
      /* v2.3: persiste la vista para que al recargar (F5) no vuelva a Inicio */
      try { if (typeof _snapLoc === 'function') sessionStorage.setItem('sp-nav', JSON.stringify(_snapLoc())); } catch (e) {}
    }

    /* ═══ ESCALA UNIFORME (v2.4) ═══
       El layout mide 1160px de diseño y se ve idéntico en todos los dispositivos.
       En móvil/tablet escala el propio navegador (meta viewport width=1160).
       En ventanas de escritorio más angostas que 1160px, se escala con zoom
       proporcional para que todo el contenido quede visible sin scroll lateral. */
    var DISENO_ANCHO = 1160;
    function ajustarEscala() {
      var w = document.documentElement.clientWidth;
      document.body.style.zoom = (w > 0 && w < DISENO_ANCHO) ? String(w / DISENO_ANCHO) : '';
    }
    window.addEventListener('resize', ajustarEscala);
    ajustarEscala();

