/* SPORTLY360° · js/core.js — estado global + sidebar premium (v2.0). */
    /* ── Estado ── */
    var comps = [];
    var seasonsMap = {};   /* competicion_id -> {temporada: 1} */
    var currentId = null, currentComp = null, currentSeason = null;
    var currentPosList = [], currentGol = [];
    var tab = 'tabla';
    var seasonSel = {};      /* v2.0: temporada elegida por competición (se conserva al navegar) */
    var compViewKey = null;  /* v2.0: qué comp+temporada muestra comp-view (para volver sin recargar) */
    var sbMini = false;      /* v2.0: sidebar contraído (solo durante la sesión, en memoria) */

    /* ── Inicio: competiciones + temporadas en paralelo (1 sola vez) ── */
    async function init() {
      var r = await Promise.all([
        sb.from('competiciones').select('*').order('orden'),
        sb.from('posiciones').select('competicion_id,temporada')
      ]);
      comps = r[0].data || [];
      (r[1].data || []).forEach(function(x) {
        (seasonsMap[x.competicion_id] = seasonsMap[x.competicion_id] || {})[x.temporada] = 1;
      });
      document.getElementById('sb-toggle').innerHTML = ico('colapsar', 17);
      renderSidebar();
      irInicio();
      cargarFavoritos();   /* v1.1: carga favoritos del usuario y sincroniza la UI */
    }

    var enHome = true;

    /* ── Sidebar premium (v2.0): principal + competiciones + más ──
       Ítems accesibles: role, tabindex, Enter/Espacio, aria-current, tooltip al contraer. */
    function navKey(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }
    function sbItem(icon, texto, accion, activo, extraAttr) {
      return '<div class="nav-item' + (activo ? ' active' : '') + '" role="button" tabindex="0" onclick="' + accion +
        '" onkeydown="navKey(event)"' + (activo ? ' aria-current="page"' : '') +
        (sbMini ? ' title="' + texto + '"' : '') + ' aria-label="' + texto + '"' + (extraAttr || '') + '>' +
        '<span class="ni-ico">' + ico(icon, 19) + '</span><span class="ni-txt">' + texto + '</span></div>';
    }
    function renderSidebar() {
      /* Principal */
      document.getElementById('nav-main').innerHTML =
        sbItem('inicio', 'Inicio', 'sbAccion(\'inicio\')', enHome) +
        sbItem('buscar', 'Buscar', 'sbAccion(\'buscar\')', false) +
        sbItem('favorito', 'Favoritos', 'sbAccion(\'fav\')', false) +
        sbItem('calendario', 'Calendario', 'sbAccion(\'cal\')', false);
      /* Competiciones (ligas / copas) */
      var ligas = '', copas = '';
      comps.forEach(function(c) {
        var activo = !enHome && c.id === currentId;
        var item = '<div class="nav-item' + (activo ? ' active' : '') + '" role="button" tabindex="0"' +
          ' onclick="selectComp(\'' + c.id + '\')" onkeydown="navKey(event)"' +
          (activo ? ' aria-current="page"' : '') + (sbMini ? ' title="' + c.nombre + '"' : '') +
          (c.color ? ' style="--comp-color:' + c.color + '"' : '') +
          ' aria-label="' + c.nombre + '">' +
          '<img src="' + c.logo + '" alt=""><span class="ni-txt">' + c.nombre + '</span></div>';
        if (c.tipo === 'cup') copas += item; else ligas += item;
      });
      document.getElementById('nav-ligas').innerHTML = ligas;
      document.getElementById('nav-copas').innerHTML = copas;
      /* Más (preparado para futuras versiones; Toast "próximamente") */
      document.getElementById('nav-extra').innerHTML =
        sbItem('config', 'Configuración', 'sbAccion(\'config\')', false) +
        sbItem('perfil', 'Perfil', 'sbAccion(\'config\')', false) +
        sbItem('ayuda', 'Ayuda', 'sbAccion(\'prox\')', false) +
        sbItem('acerca', 'Acerca de', 'sbAccion(\'prox\')', false);
    }

    /* Acciones del sidebar (reutiliza irInicio/dashAccion/toast; nunca produce errores) */
    function sbAccion(k) {
      if (k === 'inicio') { irInicio(); return; }
      if (k === 'buscar') { irInicio(); setTimeout(function() { var i = document.getElementById('ds-input'); if (i) i.focus(); }, 120); return; }
      if (k === 'fav')    { irInicio(); setTimeout(function() { dashAccion('fav'); }, 150); return; }
      if (k === 'cal')    { toast('Calendario disponible próximamente.'); return; }
      if (k === 'config') { irConfig(); return; }
      toast('Función próximamente.');
    }

    /* Sidebar colapsable (estado solo en memoria, dura la sesión) */
    function toggleSidebar() {
      sbMini = !sbMini;
      document.querySelector('.layout').classList.toggle('sb-mini', sbMini);
      var b = document.getElementById('sb-toggle');
      b.setAttribute('aria-expanded', String(!sbMini));
      b.setAttribute('aria-label', sbMini ? 'Expandir menú' : 'Contraer menú');
      renderSidebar();          /* re-render: agrega/quita tooltips */
      pintarUsuario();          /* footer compacto/expandido */
    }

    function selectComp(id) {
      pushHist();                                  /* v2.0: historial en memoria */
      enHome = false;
      var nueva = id !== currentId;
      currentId = id;
      currentComp = comps.find(function(c) { return c.id === id; });
      renderSidebar();
      var seasons = Object.keys(seasonsMap[id] || {}).sort().reverse();
      currentSeason = (seasonSel[id] && seasons.indexOf(seasonSel[id]) >= 0) ? seasonSel[id] : (seasons[0] || null);   /* conserva la temporada elegida */
      if (nueva) tab = 'tabla';   /* v2.2: al entrar a otra competición se abre la Tabla de posiciones */
      loadData();
    }

    function cambiarTemporada(s) { currentSeason = s; seasonSel[currentId] = s; loadData(); }
