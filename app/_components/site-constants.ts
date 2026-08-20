// Host canonico del sitio principal (marketing). DEBE ir con www: es el host
// que airsoft-app declara en metadataBase, sitemap y robots. Mantener www en
// los 3 hosts evita el "canonical split" apex-vs-www que dispersa señales.
export const SITE_URL = "https://www.experienciaairsoft.com";
export const SHOP_URL = "https://tienda.experienciaairsoft.com";
// App / plataforma (reservas y cuenta). Mismo valor que airsoft-app.
export const APP_URL = "https://app.experienciaairsoft.com";

// Línea de contacto de LA TIENDA. Es propia, distinta de la del predio —
// igual que la tienda tiene su propio Instagram.
export const WHATSAPP_NUMBER = "+54 9 11 3131-0742";
export const WHATSAPP_URL = "https://wa.me/5491131310742";
// El mismo número en E.164, que es el formato que espera schema.org.
export const WHATSAPP_E164 = "+5491131310742";

// Teléfono de la MARCA, el del host www.
//
// No es un duplicado por descuido: el nodo Organization del JSON-LD se emite
// desde los 3 hosts con el MISMO @id para que Google los una en una sola
// entidad. Si cada host declarara ahí su propio teléfono, esa entidad quedaría
// con dos números en conflicto. Entonces el nodo Organization lleva SIEMPRE
// este valor —espejo de TELEPHONE_E164 en airsoft-app— y el número propio de
// la tienda va en el nodo OnlineStore, que sí es suyo.
//
// Si cambia el número de www, hay que cambiarlo acá también.
export const BRAND_TELEPHONE_E164 = "+5491138689783";
// Instagram primario para la tienda (header/footer apuntan acá).
export const INSTAGRAM_URL = "https://www.instagram.com/tienda.experienciaairsoft/";
// Instagram de la holding — solo se usa en JSON-LD sameAs para que Google
// relacione las dos cuentas como entidades hermanas.
export const INSTAGRAM_MAIN_URL = "https://www.instagram.com/experienciaairsoft/";
export const YOUTUBE_URL = "https://www.youtube.com/@experienciaairsoft8250";

export const ADDRESS_STREET = "Gral. Conesa 1858";
export const ADDRESS_CITY = "Ciudad Autónoma de Buenos Aires";
export const ADDRESS_POSTAL = "C1870";
export const ADDRESS_COUNTRY = "Argentina";
export const MAPS_URL =
  "https://www.google.com/maps/search/?api=1&query=Gral.+Conesa+1858,+CABA";

export const SHOP_EMAIL = "hola@experienciaairsoft.com";

// Cross-domain nav: links al sitio principal (absolutos).
export const MAIN_NAV = [
  { href: `${SITE_URL}/`, label: "Inicio" },
  { href: `${SITE_URL}/precios`, label: "Precios" },
  { href: `${SITE_URL}/buenos-aires`, label: "Buenos Aires" },
  { href: `${SITE_URL}/primera-vez`, label: "Primera vez" },
  { href: `${SITE_URL}/blog`, label: "Blog" },
] as const;

// Nav interna de la tienda (rutas relativas dentro del subdomain).
export const SHOP_NAV = [
  { href: "/", label: "Tienda" },
  { href: "/productos", label: "Productos" },
  { href: "/categorias", label: "Categorías" },
  { href: "/pedidos-exterior", label: "Pedidos del exterior" },
] as const;
