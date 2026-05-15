# Tienda Experiencia Airsoft — Plan de fases

E-commerce headless con backend Tiendanube + frontend Next 16.2 propio bajo
`tienda.experienciaairsoft.com`. Este doc resume las 5 fases del proyecto y
el estado de cada una.

---

## Stack

- **Frontend**: Next.js 16.2 (App Router, Turbopack) + React 19.2 + TypeScript strict
- **UI**: Tailwind v4 + design tokens propios (ink/bone/orange/ash/smoke) + `next/image` + `lucide-react`
- **Estado cliente**: Zustand 5 con persist en localStorage (carrito local)
- **Validación**: Zod 3 (toda respuesta de TN validada con schema tolerante)
- **Analytics**: `@vercel/analytics`
- **Caching**: `'use cache'` directive de Next 16 (flag `experimental.useCache: true`)
- **Backend**: Tiendanube REST API `2025-03` — catálogo, checkout, pagos (MercadoPago), envíos (Andreani + MercadoEnvíos), AFIP (TusFacturas)
- **Hosting**: Vercel

---

## Fase 1 — Cliente API + catálogo público ✅ **COMPLETA**

Cubre lo mínimo para tienda navegable con productos reales de Tiendanube:
cliente API tipado, listados, detalle de producto, categorías, SEO técnico.

**Entregables**:

- ✅ `lib/tiendanube/` — cliente con retry/backoff, schemas Zod tolerantes,
  funciones cacheadas (`getProducts`, `getProductByHandle`, `getCategories`,
  `getAllProductHandles`, etc.).
- ✅ Header `Authentication: bearer <token>` (literal — sí, `Authentication`
  no `Authorization`, "bearer" lowercase).
- ✅ Rate-limit aware: retry exponencial + jitter en 429, respeta `Retry-After`.
- ✅ Helpers de pricing (centavos enteros), i18n defensivo (`extractEs`),
  stock por variante.
- ✅ `'use cache'` + `cacheLife('hours'|'days')` + `cacheTag(...)` con
  convención central en `lib/tiendanube/tags.ts` (load-bearing para Fase 3).
- ✅ Home `/` con featured products + categorías destacadas.
- ✅ Listado `/productos` con filtros (categoría, precio min/max, orden),
  paginación, breadcrumbs, chips de filtros activos.
- ✅ Detail `/productos/[handle]` con galería interactiva, variant selector,
  AddToCart (Zustand stub), JSON-LD `Product`, metadata async, OG dinámica.
- ✅ `/categorias` y `/categorias/[handle]` con subcategorías + filtros.
- ✅ `app/sitemap.ts` (lee TN paginado), `app/robots.ts`, `not-found.tsx`,
  `error.tsx`, root `opengraph-image.tsx`.
- ✅ Branding copiado de `../airsoft-app/`: design tokens, `og-template.tsx`,
  favicons programáticos, header/footer adaptados con cross-domain links
  (header tienda-only + footer con cross-links a `experienciaairsoft.com`).

**Hallazgos de la API durante implementación**:

- **CDN hostname real**: `dcdn-us.mitiendanube.com` (cubierto por wildcard
  `**.mitiendanube.com` en `next.config.ts → images.remotePatterns`).
- **`sort_by` valores válidos**: `price-{ascending,descending}`,
  `name-{ascending,descending}`, `user` (orden manual admin), `best-selling`.
  Default sin param = orden cronológico. `created_at-descending` (de los docs)
  **NO es válido** y devuelve 422 — fix aplicado.
- **`has_stock`** viene a nivel producto, no hay que iterar variantes en la mayoría
  de casos.
- **`compare_at_price`** además de `promotional_price` — ambos se usan en la
  capa de UI (`PriceTag`).
- **i18n**: el store actual solo trae `{es}`. Schema soporta `en`/`pt` con
  fallback.
- **`cacheLife` y `cacheTag`** están sin prefijo `unstable_` en Next 16.2.6
  (verificado contra `node_modules/next/cache.d.ts`).

---

## Fase 2 — Carrito + checkout delegado 🟢 **UI/handoff lista, falta E2E**

Mínimo viable: carrito UI completo + handoff al checkout de Tiendanube.

- [x] Carrito UI: `/carrito` con resumen, cantidades editables (clampeadas
  a `snapshot.maxQty`), eliminación por item, subtotal, link "seguir
  comprando", panel resumen sticky en desktop.
- [x] Mini-carrito drawer (slide-over desde la derecha) montado en el
  layout (`components/cart/cart-drawer.tsx`), abierto desde
  `<CartHeaderButton>` con badge contador. AddToCart dispara
  `pulseOpen()` con auto-close a 4s si el user no interactúa
  (`isPinned`).
- [x] `POST /api/cart/checkout` valida items con Zod y arma deeplink al
  storefront nativo de TN con el patrón
  `?_cart_action=add_multiple&variants[ID]=QTY`. El cliente hace
  `window.location.href = data.url`. El cobro lo maneja TN con MP.
- [x] Páginas `/checkout/exito` (limpia el carrito local con
  `<CartClearOnMount>`) y `/checkout/error` (CTA a `/carrito` y WA). Ambas
  `robots: { index: false, follow: false }`.
- [ ] **Bloqueante producción**: setear `TIENDANUBE_STORE_URL` en
  `.env.local` y en Vercel (subdominio nativo TN tipo
  `https://<nombre>.mitiendanube.com`). Sin esa var, `/api/cart/checkout`
  responde 500 con mensaje claro.
- [ ] En el panel TN configurar URLs de retorno post-pago apuntando a
  `https://tienda.experienciaairsoft.com/checkout/{exito,error}`.
- [ ] Validación de stock pre-checkout (nice-to-have): hoy confiamos en el
  `maxQty` snapshot al agregar; sumar refetch contra TN antes de redirigir
  para evitar OOS-en-checkout.
- [ ] Test E2E manual: agregar producto → drawer abre → "Iniciar compra" →
  checkout TN con MP test → return a `/checkout/exito` → carrito vacío.

---

## Fase 3 — Webhooks + estado de pedido (2-3 días)

**Bloqueada** hasta tener URL pública (deploy Vercel) para registrar webhooks
en el panel de TN.

- [ ] `POST /api/tiendanube/webhook` con verificación de firma HMAC SHA256
  usando `TIENDANUBE_WEBHOOK_SECRET`.
- [ ] Handlers para eventos: `order/created`, `order/paid`,
  `order/cancelled`, `order/fulfilled`, `product/updated`, `product/created`,
  `product/deleted`, `category/updated`.
- [ ] Invalidación de cache con `revalidateTag(tag, 'max')` usando los tags
  definidos en `lib/tiendanube/tags.ts`. Ejemplo:
  ```ts
  // product/updated
  revalidateTag(productHandleTag(payload.handle), 'max');
  revalidateTag(productIdTag(payload.id), 'max');
  revalidateTag(productsAllTag(), 'max');
  ```
- [ ] Script `scripts/register-webhooks.ts` que registra todos los webhooks
  vía API la primera vez (idempotent — chequea si ya están registrados).
- [ ] Logging estructurado a Vercel Logs. Opcional: forward a Slack/Discord
  para alertas de pedidos nuevos.
- [ ] Test: postman/curl simulando webhook → verificar firma + revalidate
  + log.

---

## Fase 4 — SEO + contenido (5-7 días)

Cluster pages SEO-friendly + estructura de blog.

- [ ] Pages cluster con JSON-LD `CollectionPage`:
  - `/marcadoras-electricas`, `/marcadoras-de-gas`, `/bbs-y-municion`,
    `/proteccion-anteojos`, `/chalecos-tacticos`, `/accesorios`.
  - Cada uno: heading H1 optimizado + copy 200-400 palabras + lista de
    productos curada (filtrado por handle de categoría).
- [ ] `/blog` con MDX o headless CMS (opcional). Posts compartidos con la
  landing principal (cross-domain links).
- [ ] OG images dinámicas para cluster pages.
- [ ] Schema.org `BreadcrumbList` en todas las páginas (extender
  `<Breadcrumbs>`).
- [ ] Schema.org `Organization` global con address + sameAs (IG/YT/WhatsApp).
- [ ] Auditoría Lighthouse SEO ≥ 95 en home, listado, detalle, categorías.

---

## Fase 5 — Post-MVP

Mejoras iterativas a sumar según traction:

- [ ] **Búsqueda**: TN endpoint `?q=` con autocomplete (`/api/search?q=`).
- [ ] **Wishlist**: Zustand store + persist (anónimo); opcional sync con
  Supabase si hay login.
- [ ] **Reviews custom**: tabla en Supabase + UI de estrellas + moderación.
  (Reviews nativas de TN no se exponen vía API headless.)
- [ ] **Cross-sell con plataforma de partidas**: banner contextual "Pedí
  esto + reservá tu próxima partida" linkea a `experienciaairsoft.com/precios`.
- [ ] **Filtros avanzados**: por atributo (talle, color), por marca, por
  rango de potencia FPS.
- [ ] **Variant images**: cuando una variante tiene `image_id` distinto,
  cambiar la imagen principal al seleccionarla.
- [ ] **Carrito sincronizado**: si el usuario inicia sesión (TN customers
  API), traer carrito server-side.
- [ ] **`cacheComponents: true`** migration con islands `<Suspense>` para
  stock en tiempo real.
- [ ] **E2E tests** con Playwright (smoke flow completo).

---

## Verificación end-to-end (checklist)

Smoke tests manuales — ejecutar antes de cada deploy a producción:

- [ ] `/` muestra featured products con precio/imagen/nombre. Segundo hit
  sin requests a TN (cache hit).
- [ ] `/productos` lista 24 productos. `?page=2`, `?precio_min=10000`,
  `?orden=baratos` funcionan.
- [ ] `/productos/<handle>` carga; JSON-LD presente (verificar con Rich
  Results Test); OG renderiza en `/productos/<handle>/opengraph-image`.
- [ ] Variant selector cambia el precio mostrado.
- [ ] AddToCart agrega al Zustand store (visible en React DevTools).
- [ ] `/categorias` + `/categorias/<handle>` funcionan.
- [ ] `/sitemap.xml` lista productos + categorías.
- [ ] `/robots.txt` correcto.
- [ ] `/producto-inexistente` → 404 con branding (no 500).
- [ ] Sin token → fail-fast al boot con mensaje claro.
- [ ] Build: `npm run build` completa sin errores ni warnings Turbopack.

---

## Convenciones de código

- **Precios**: siempre `number` en centavos enteros. `formatARS(cents)` para
  mostrar.
- **i18n**: extraer con `extractEs(v)` defensivamente (tolera `null`,
  `string`, `{es}` y variantes).
- **Slug**: en la API se llama `handle`. Nunca `slug`.
- **Header HTTP**: `Authentication: bearer <token>` (literal — atípico).
- **Caching**: `'use cache'` con `cacheLife()` + `cacheTag()` en cada
  función del cliente. NUNCA en handlers de rutas (Next 16 no lo permite ahí).
- **Next 16 params**: SIEMPRE `await params` y `await searchParams` — son
  `Promise<...>`.
- **Imágenes externas**: `next/image` con `sizes` específico. AVIF/WebP
  habilitado en config.
- **Branding**: clases del design system (`ink`, `bone`, `orange`,
  `clip-notch`, `mil-tag`, `sect-label`, `fluid-*`, `btn-wa`). Evitar
  Tailwind ad-hoc cuando hay token equivalente.
- **Glosario**: "marcadoras", "BBs/balines", "eliminación", "cuarto
  cerrado", "táctico", "tirador de precisión". NUNCA lenguaje bélico.

---

## Variables de entorno

Ver `.env.example`. Resumen:

| Var | Origen | Notas |
|-----|--------|-------|
| `TIENDANUBE_STORE_ID` | OAuth manual | Numérico |
| `TIENDANUBE_ACCESS_TOKEN` | OAuth manual | Bearer token |
| `TIENDANUBE_CLIENT_ID` | Partners Portal app | `31778` |
| `TIENDANUBE_CLIENT_SECRET` | Partners Portal app | Solo en Vercel |
| `TIENDANUBE_USER_AGENT` | Constante | `"Experiencia Airsoft Store (hola@experienciaairsoft.com)"` |
| `TIENDANUBE_WEBHOOK_SECRET` | Random hex 32 bytes | Para Fase 3 |
| `NEXT_PUBLIC_SITE_URL` | Constante | `https://tienda.experienciaairsoft.com` |

---

## Próximos pasos inmediatos

1. Deploy preview en Vercel (tag/push de la rama).
2. Verificar smoke tests en preview URL.
3. Promote a `tienda.experienciaairsoft.com` cuando esté listo.
4. Una vez con URL pública: arrancar Fase 3 (registrar webhooks).
5. Sumar productos restantes en el panel de TN.
