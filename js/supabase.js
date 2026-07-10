/* SPORTLY360° · js/supabase.js — refactor transparente: mismo código, solo reorganizado (no cambia diseño ni comportamiento). */
    const sb = window.supabase.createClient(SB_URL, SB_ANON);

    async function cerrarSesion(e) {
      e.preventDefault();
      await sb.auth.signOut();
      location.href = 'index.html';
    }

    /* ── Usuario del footer del sidebar (v2.0): avatar con inicial + nombre + correo ── */
    var userNombre = 'jugador', userEmail = '';
    function pintarUsuario() {
      var f = document.getElementById('sb-footer');
      if (!f) return;
      var ini = (userNombre || 'J').trim().charAt(0).toUpperCase();
      f.innerHTML =
        '<div class="sb-user">' +
          '<span class="sb-ava" aria-hidden="true">' + ini + '</span>' +
          '<div class="sb-uinfo"><div class="sb-uname" id="greet-name">' + userNombre + '</div>' +
            (userEmail ? '<div class="sb-umail">' + userEmail + '</div>' : '') + '</div>' +
          '<a class="sb-out" href="index.html" onclick="cerrarSesion(event)" aria-label="Cerrar sesión" title="Cerrar sesión">' + ico('salir', 17) + '</a>' +
        '</div>';
    }

    /* Nombre (del parámetro o de la sesión) + correo de la sesión */
    var params = new URLSearchParams(location.search);
    var nombre = params.get('nombre');
    if (nombre) userNombre = nombre;
    pintarUsuario();
    sb.auth.getUser().then(function(res) {
      var u = res.data && res.data.user;
      if (u) {
        var m = u.user_metadata || {};
        var full = [m.nombre, m.apellido].filter(Boolean).join(' ') || m.full_name || m.name;
        userNombre = nombre || full || u.email.split('@')[0];
        userEmail = u.email || '';
        pintarUsuario();
      }
    });

