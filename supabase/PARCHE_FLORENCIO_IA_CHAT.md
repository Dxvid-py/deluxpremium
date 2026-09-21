# PARCHE FLORENCIO — IA + CHAT SIN CORTE

## 1. Edge Function

Reemplaza:

`supabase/functions/florencio-ai/index.ts`

por el `florencio-ai-fixed.ts` incluido en este paquete.

El error de Supabase es inequívoco:

`Invalid value: 'input_text'. Supported values are: 'output_text' and 'refusal'.`

La petición estaba llegando a OpenAI con un bloque de contenido incompatible. La versión corregida envía `system` y `user` como texto simple y conserva la extracción robusta de `output_text`.

Después despliega:

```powershell
npx supabase functions deploy florencio-ai
```

Cuando funcione, en Logs ya no debe aparecer el 400 de `input_text`.

---

## 2. Evitar recomendaciones en "hola"

En:

`src/components/FlorencioCatalogAssistant.tsx`

busca:

```tsx
const nextRecs = getRecommendations(merged);
const reply = result.reply.length > 220
```

y reemplaza por:

```tsx
const nextRecs =
  result.intent === "recommendation"
    ? getRecommendations(merged)
    : [];

let reply = result.reply;

if (
  result.intent === "recommendation" &&
  nextRecs.length === 0 &&
  merged.budgetMax
) {
  reply =
    `No encontré una opción del catálogo que cumpla tu presupuesto de $${merged.budgetMax.toLocaleString("es-CO")}.`;
}

reply = reply.length > 220 ? `${reply.slice(0, 217)}…` : reply;
```

Así:

- "hola" → conversación, sin productos.
- "quién eres" → conversación, sin productos.
- "es para mi novia" → discovery, sin productos prematuros.
- cuando ya hay suficiente información → recommendation + catálogo real.
- presupuesto sin coincidencias → no hace fallback a productos más caros.

---

## 3. Quitar el fallback que puede romper el presupuesto

Busca:

```tsx
const getRecommendations = (next: FlorencioFilters) => {
  const ranked = rankFlorencioProducts(products, categories, next, 4);
  return ranked.length
    ? ranked
    : products.filter((p) => p.is_active).slice(0, 4);
};
```

Reemplázalo por:

```tsx
const getRecommendations = (next: FlorencioFilters) =>
  rankFlorencioProducts(products, categories, next, 4);
```

Esto es importante: si no existe coincidencia, Florencio no debe mostrar productos arbitrarios.

---

## 4. Fallback del catch

Busca dentro del `catch`:

```tsx
const nextRecs = getRecommendations(merged);
```

y cambia a:

```tsx
const nextRecs: ReturnType<typeof rankFlorencioProducts> = [];
```

El fallback local debe servir para que el chat no se rompa, no para inventar una recomendación.

---

## 5. Chat que se corta

En el mismo componente busca:

```tsx
<div className="relative min-h-[780px] lg:grid lg:grid-cols-[228px_minmax(0,1fr)]">
```

Reemplaza por:

```tsx
<div className="relative h-[calc(100dvh-7rem)] min-h-[620px] lg:grid lg:grid-cols-[228px_minmax(0,1fr)]">
```

Luego busca:

```tsx
<main className="flex min-h-[780px] min-w-0 flex-col">
```

y reemplaza por:

```tsx
<main className="flex min-h-0 min-w-0 flex-col">
```

El chat ya tiene correctamente:

```tsx
<div className="min-h-0 flex-1 overflow-y-auto ...">
```

por lo que el contenido interno puede hacer scroll y el composer queda fijo abajo.

---

## 6. IMPORTANTE: el footer del chat

El footer del composer ya tiene:

```tsx
className="shrink-0 ..."
```

Eso está bien.

No debes quitar:

```tsx
min-h-0
flex-1
overflow-y-auto
shrink-0
```

Esas cuatro piezas son las que permiten que:

- los mensajes hagan scroll;
- el input permanezca visible;
- el chat no empuje el footer fuera de la pantalla.

---

## 7. Probar

Primero:

```powershell
npm run build
```

Después:

```powershell
npx supabase functions deploy florencio-ai
```

Luego abre `/florencio` y prueba en este orden:

1. `hola`
2. `quien eres`
3. `quiero un ramo para mi pareja`
4. `es para mi novia`
5. `quiero sorprenderla`
6. `máximo 150000`

En Supabase → Functions → `florencio-ai` → Logs debe aparecer una ejecución sin el error 400.

El consumo de créditos debería aparecer solamente cuando OpenAI acepta y procesa la petición; el 400 actual ocurre durante la validación de la petición, antes de una generación válida.
