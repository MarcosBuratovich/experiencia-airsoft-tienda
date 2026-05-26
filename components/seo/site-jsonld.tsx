import {
  ADDRESS_CITY,
  ADDRESS_STREET,
  INSTAGRAM_URL,
  SHOP_URL,
  WHATSAPP_NUMBER,
  YOUTUBE_URL,
} from "@/app/_components/site-constants";

// ──────────────────────────────────────────────────────────────────────
// Structured data global del site (Organization + WebSite + LocalBusiness).
//
// - Organization: identidad de la empresa, logo y redes sociales.
// - WebSite con SearchAction: habilita el "sitelinks searchbox" en Google
//   (caja de búsqueda que aparece bajo el sitio en resultados).
// - LocalBusiness/Store: presencia física en CABA — ayuda en búsquedas
//   locales con intención.
//
// Todos comparten "@id" estables para que Google los enlace como un grafo.
// ──────────────────────────────────────────────────────────────────────

const ORG_ID = `${SHOP_URL}/#organization`;
const SITE_ID = `${SHOP_URL}/#website`;
const STORE_ID = `${SHOP_URL}/#store`;

export function SiteJsonLd() {
  const graph = [
    {
      "@type": "Organization",
      "@id": ORG_ID,
      name: "Experiencia Airsoft",
      alternateName: "Tienda Experiencia Airsoft",
      url: SHOP_URL,
      logo: `${SHOP_URL}/icon.png`,
      image: `${SHOP_URL}/icon.png`,
      sameAs: [INSTAGRAM_URL, YOUTUBE_URL].filter(Boolean),
      contactPoint: [
        {
          "@type": "ContactPoint",
          telephone: WHATSAPP_NUMBER,
          contactType: "customer service",
          areaServed: "AR",
          availableLanguage: ["es", "es-AR"],
        },
      ],
    },
    {
      "@type": "WebSite",
      "@id": SITE_ID,
      url: SHOP_URL,
      name: "Tienda Experiencia Airsoft",
      publisher: { "@id": ORG_ID },
      inLanguage: "es-AR",
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${SHOP_URL}/productos?q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "Store",
      "@id": STORE_ID,
      name: "Tienda Experiencia Airsoft",
      url: SHOP_URL,
      image: `${SHOP_URL}/icon.png`,
      telephone: WHATSAPP_NUMBER,
      priceRange: "$$",
      address: {
        "@type": "PostalAddress",
        streetAddress: ADDRESS_STREET,
        addressLocality: ADDRESS_CITY,
        addressRegion: "Buenos Aires",
        addressCountry: "AR",
      },
      parentOrganization: { "@id": ORG_ID },
      sameAs: [INSTAGRAM_URL, YOUTUBE_URL].filter(Boolean),
    },
  ];
  const data = { "@context": "https://schema.org", "@graph": graph };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

interface Crumb {
  name: string;
  url?: string;
}

export function BreadcrumbJsonLd({ items }: { items: Crumb[] }) {
  if (items.length === 0) return null;
  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      ...(it.url ? { item: it.url } : {}),
    })),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
