# SPORTLY360&deg;

Aplicaci&oacute;n web de **estad&iacute;sticas de f&uacute;tbol profesional**: tablas de posiciones, goleadores, fixture y estad&iacute;sticas por jugador de las 5 grandes ligas europeas y las 3 competiciones UEFA.

## Estado actual

- `index.html` &mdash; pantalla de **acceso** (login/registro con verificaci&oacute;n por c&oacute;digo). Login demo por ahora.
- `inicio.html` &mdash; **estad&iacute;sticas**: selector de competici&oacute;n, tabla de posiciones y goleadores.
- `data.js` &mdash; datos cacheados de la temporada 2024/25 (provienen de [API-Football](https://www.api-football.com/)).

Tema visual: fondo negro + acento lima el&eacute;ctrico `#c6ff00`.

## Stack previsto

| Pieza | Rol |
|-------|-----|
| **Vercel** | Hosting + funciones serverless (`/api`) para proxy a API-Football (protege la clave y cachea). |
| **Supabase** | Autenticaci&oacute;n real (correo/Google) y base de datos (perfiles, suscripciones). |
| **GitHub** | Repositorio con auto-deploy a Vercel. |
| **API-Football** | Fuente de datos de f&uacute;tbol. |

## Desarrollo local

Abre `index.html` directamente en el navegador. Los datos se cargan desde `data.js` (no requiere servidor).

## Pr&oacute;ximos pasos

- [ ] Desplegar en Vercel
- [ ] Mover la clave de API-Football a una funci&oacute;n serverless con cach&eacute;
- [ ] Login real con Supabase Auth
- [ ] Suscripci&oacute;n premium (estad&iacute;sticas avanzadas)
- [ ] Fixture/resultados y detalle por jugador
