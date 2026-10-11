# 🏆 Mundial de Películas

Cargás dos watchlists de Letterboxd, la app cruza las películas en común, completa el cuadro
(8, 16, 32 o 64) y las películas se enfrentan de a dos hasta que queda una campeona.

## Correrlo

```bash
cp .env.example .env.local   # y completar las claves
npm install
npm run dev                  # http://localhost:3000
npm test                     # lógica del cuadro y sorteo
```

## Cómo funciona

- **Letterboxd**: lee la watchlist pública (`/{usuario}/watchlist/`) o un `watchlist.csv` exportado. No hay API oficial.
- **TMDB**: póster, fecha, director, cast, sinopsis. **OMDb**: ratings de IMDb/RT/Metacritic y premios.
- **Datos curiosos**: armados con datos reales (taquilla, críticas, sagas), sin IA.
- Todo el progreso se guarda en el navegador (`localStorage`); no hay base de datos.

## Publicar en Vercel

1. Subir el repo a GitHub e importarlo en vercel.com.
2. Cargar `TMDB_API_TOKEN` y `OMDB_API_KEY` en *Settings → Environment Variables*.
3. Probar el botón **Cargar** con un usuario real. Si Letterboxd bloquea al servidor, usar el CSV.
