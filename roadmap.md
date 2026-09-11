# Roadmap

## Hecho
- [x] Instalar GSAP
- [x] Copiar verbatim `CinematicCollectionsFilm.tsx` a `src/components/`
- [x] Reemplazar `src/routes/index.tsx` por el subido (verbatim)
- [x] Verificar typecheck + dev server + capturas (0 errores en carga limpia)
- [x] Pétalos reales a pantalla completa en transición de producto/colección
- [x] Arreglar pétalos invisibles (preflight `img{max-width:100%}` los achicaba a 0 por contenedor 0×0 → `maxWidth:none`)
- [x] Videos del hero por dispositivo: hero-mobile.mp4 (vertical) y hero-desktop.mp4 (horizontal) en CDN, seleccionados con `useIsMobile`

## Pendiente / observado
- Aviso de hidratación en `/` por colecciones que solo existen en cliente (useQuery sin SSR). No bloquea; pre-existente.
