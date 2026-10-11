# Mundial de Películas — Plan

Web para dos personas: se cruzan sus watchlists de Letterboxd, se arma un cuadro de eliminación directa y las películas se enfrentan de a dos hasta que queda una campeona.

## Decisiones tomadas

| Tema | Decisión | Qué implica |
|---|---|---|
| Votación | Juntos, en una sola pantalla | Sin cuentas, sin sincronización en tiempo real, sin base de datos compartida |
| Desacuerdos | Lo charlan y eligen una | Un solo clic por versus, sin lógica de desempate |
| Formato | Eliminación directa | Mundial de N películas = N−1 versus (16 → 15, 32 → 31) |
| Letterboxd | Perfiles públicos | Se lee la watchlist con el nombre de usuario (probado: funciona) |
| IA | No se usa Claude | Sin pros/contras. Premios y datos curiosos salen de datos reales |

---

## 1. Fuentes de datos

- **Letterboxd (watchlist pública)**: el servidor lee `letterboxd.com/{usuario}/watchlist/page/N/`. Cada película trae su slug, y la ficha de la película en Letterboxd trae el **ID de TMDB y de IMDb**, así que el cruce es exacto (sin adivinar por título).
  - Respaldo: subir el `watchlist.csv` exportado, por si Letterboxd bloquea las lecturas desde el servidor de Vercel.
- **TMDB** (gratis): póster, fecha, director, cast principal con foto, sinopsis en español, géneros, duración, presupuesto, recaudación, frase promocional (tagline), palabras clave, saga.
- **OMDb** (gratis, 1000 consultas/día): rating de IMDb, Rotten Tomatoes y Metacritic, y el campo **Awards** (premios y nominaciones).

### Datos curiosos sin IA (se generan con reglas a partir de datos reales)
- Premios: "Ganó 3 Oscar" / "4 nominaciones al Oscar" / "12 premios y 30 nominaciones".
- Taquilla: "Recaudó 8 veces lo que costó" o "Fue un fracaso de taquilla".
- Críticas: "98% en Rotten Tomatoes".
- Origen: "Basada en una novela" (palabra clave de TMDB), "Parte de la saga X", idioma y país de origen.
- Frase promocional de la película.

Cada versus muestra los premios si hay; si no hay, muestra 2–3 datos curiosos (o ambos si hay de los dos).

---

## 2. Stack

- **Next.js (App Router) + TypeScript + Tailwind**.
- **Rutas del servidor de Next** para leer Letterboxd y llamar a TMDB/OMDb (las claves no llegan al navegador).
- **Sin Supabase**: el torneo se guarda en el `localStorage` del navegador. Si se cierra la pestaña, se retoma donde quedó.
- Caché de películas en el servidor (la caché de `fetch` de Next) para no repetir consultas.
- Publicación en **Vercel**.

Variables de entorno: `TMDB_API_KEY`, `OMDB_API_KEY`.

---

## 3. Flujo de la app

```
Inicio → Watchlists → Coincidencias → Completar cuadro → Sorteo → Versus ×(N−1) → Campeona
```

1. **Watchlists**: dos campos con los usuarios de Letterboxd (o subir CSV).
2. **Coincidencias**: grilla de pósters de las películas que están en las dos listas. Se puede sacar alguna a mano.
3. **Completar cuadro**: el tamaño es 8, 16, 32 o 64. Se propone la potencia de 2 más cercana hacia arriba.
   - Si faltan *k* películas, la app propone películas de la watchlist de **uno solo**, **alternando una de cada uno** para que quede parejo. También se pueden rechazar sugerencias o buscar a mano.
   - Opción alternativa: bajar al tamaño inferior y eliminar las que sobren.
4. **Sorteo**: aleatorio o con cabezas de serie (por rating), para que las favoritas no se crucen temprano.
5. **Versus**: dos tarjetas enfrentadas (una sobre otra en el celular, lado a lado en la compu). Cada tarjeta muestra:
   - Título, póster, fecha de estreno, director, cast principal (3–5 con foto), sinopsis breve
   - Ratings (IMDb / RT / Metacritic), duración, géneros
   - Premios y/o datos curiosos
   - Botón **"Pasa esta"**, con opción de deshacer el último voto.
6. **Cuadro**: vista de la llave completa que se va llenando (octavos → cuartos → semi → final).
7. **Campeona**: ganadora, el camino que hizo y un link a Letterboxd para marcarla.

---

## 4. Fases

1. **Base**: proyecto Next.js, clientes de TMDB y OMDb, función `getMovie(tmdbId)` que arma la ficha completa + datos curiosos.
2. **Letterboxd**: lector de watchlist con paginación, extracción de IDs de TMDB, parser de CSV y pantalla de coincidencias.
3. **Cuadro**: cálculo del tamaño, sugerencias alternadas, búsqueda manual, sorteo y generación de la llave.
4. **Versus**: pantalla de versus, avance de rondas, deshacer, vista del cuadro, pantalla de campeona, guardado en `localStorage`.
5. **Pulido**: estética de Mundial (banderines, marcador, animación de pase de ronda), modo oscuro, publicación.

---

## 5. Riesgos

- **Letterboxd puede bloquear las lecturas desde Vercel** (protección contra bots). Desde la compu funciona; en producción hay que probarlo apenas se publique. Por eso queda el CSV como respaldo.
- **Watchlists grandes**: para obtener el ID de TMDB hay que abrir la ficha de cada película, pero solo se hace con las coincidencias y las sugerencias, no con toda la lista. Igual se cachea.
- **Límite de OMDb** (1000/día): sobra para un mundial de 64.
