# Deluxury — Bilingüe + privacidad + Florencio V1

Este paquete reemplaza únicamente archivos relacionados con:

- selector de idioma antes de la intro;
- idioma persistente ES/EN;
- intento de audio real al elegir idioma;
- cookies/preferencias de privacidad;
- páginas `/privacidad` y `/cookies`;
- voz corta de Florencio ES/EN;
- chat con eliminar conversación y carga de mensajes antiguos;
- ranking de Florencio con presupuesto como techo duro;
- Edge Function de Florencio con Responses API + Structured Outputs y extracción robusta del texto de respuesta.

## Archivos para reemplazar/agregar

- `src/components/CinematicIntro.tsx`
- `src/components/FlorencioWidget.tsx`
- `src/components/FlorencioChat.tsx`
- `src/components/Footer.tsx`
- `src/routes/__root.tsx`
- `src/routes/florencio.tsx`
- `src/routes/privacidad.tsx` (nuevo)
- `src/routes/cookies.tsx` (nuevo)
- `src/components/CookieConsent.tsx` (nuevo)
- `src/lib/privacy-consent.ts` (nuevo)
- `src/lib/florencio-voice.ts` (nuevo)
- `src/lib/florencio-ai.ts`
- `src/lib/florencio-recommendations.ts`
- `supabase/functions/florencio-ai/index.ts`
- `public/audio/florencio/README.md` (nuevo)
- `AUDIO_FLORENCIO.txt` (nuevo, solo referencia)

## Audio exacto

La intro mantiene:

`public/audio/intro-deluxe.mp3`

Los 14 audios de Florencio van en:

`public/audio/florencio/`

Consulta `AUDIO_FLORENCIO.txt` para los nombres y frases exactas.

## Cómo funciona el idioma

1. Primera visita sin idioma guardado: aparece el selector Español / English.
2. El clic guarda `fdp-lang-v1` y cambia el `LanguageProvider`.
3. Ese mismo clic inicia la intro y trata de reproducir el audio con sonido, aprovechando el gesto del usuario.
4. En visitas posteriores se reutiliza el idioma guardado.
5. El botón de idioma del Header sigue funcionando para cambiarlo después.
6. Florencio cambia sus textos y rutas de voz según `lang`.

## Cookies y privacidad

No agregué analytics ni publicidad de terceros automáticamente.

La implementación crea una sola cookie de preferencias:

`deluxury_cookie_consent_v1`

Las categorías `analytics` y `marketing` quedan en false hasta que el visitante las active. El componente deja un control para reabrir las preferencias.

Importante: las páginas legales son una base técnica/operativa, no una garantía de cumplimiento legal. Antes del lanzamiento definitivo, el negocio debe revisar y completar su identidad jurídica, responsable del tratamiento, correo formal, tiempos de conservación, proveedores y finalidades reales.

## Florencio AI

La Edge Function nueva incluye:

- idioma solicitado por el cliente;
- conversaciones breves y una pregunta a la vez en discovery;
- no recomienda en saludos;
- solo usa información oficial cargada en `florencio_knowledge` y `settings`;
- presupuesto como techo duro en la app;
- Structured Outputs;
- extracción desde `output_text` o desde `output[].content[].text` para evitar el fallo anterior;
- logs de errores de OpenAI.

## Chat largo

El chat ahora muestra solo los últimos 12 mensajes inicialmente.

Si hay mensajes antiguos aparece:

`Cargar mensajes anteriores`

Ese botón sube el número visible por bloques de 12. No borra el historial.

El botón con papelera abre confirmación y permite eliminar la conversación local completa.

La conversación se guarda localmente en:

`deluxury-florencio-chat-v3`

## Pruebas

Después de reemplazar los archivos:

```powershell
npm run build
```

Luego prueba:

- primera carga con selector ES/EN;
- intro con audio;
- cambio de idioma desde Header;
- Florencio flotante cada 15 segundos;
- audio de Florencio cuando el navegador lo permita;
- `/florencio` con chat;
- eliminar chat;
- Cargar mensajes anteriores;
- saludo no muestra productos;
- discovery hace una sola pregunta;
- recommendation muestra solo productos compatibles;
- con presupuesto máximo no aparecen productos que lo superen;
- `/privacidad`;
- `/cookies`.

Para Supabase:

```powershell
npx supabase functions deploy florencio-ai
```

No necesitas una migración nueva para esta versión.

No hagas commit hasta que pruebes localmente y confirmes que todo se ve y funciona como esperas.
