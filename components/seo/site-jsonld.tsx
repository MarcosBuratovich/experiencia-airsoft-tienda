import {
  INSTAGRAM_MAIN_URL,
  INSTAGRAM_URL,
  SHOP_URL,
  SITE_URL,
  WHATSAPP_NUMBER,
  YOUTUBE_URL,
} from "@/app/_components/site-constants";

// ──────────────────────────────────────────────────────────────────────
// Structured data global de la TIENDA (WebSite + OnlineStore) más una
// referencia a la Organization CANÓNICA de la marca.
//
// Clave para sitelinks/Knowledge Panel: la entidad "Experiencia Airsoft"
// vive en 3 hosts (www, app, tienda). Para que Google los trate como UNA
// sola entidad, TODOS deben apuntar al MISMO @id de Organization, anclado
// al host canónico (www). Acá la Organization se emite como nodo de
// referencia (mismo @id que airsoft-app) y la tienda se modela como
// OnlineStore con parentOrganization hacia ese @id.
//
// - WebSite + SearchAction: caja de búsqueda funcional (/productos?q= ejecuta
//   búsqueda real contra la API de TN), distinta del searchbox de sitelinks
//   (deprecado por Google en nov-2024).
// - La dirección física (NAP) NO se re-declara acá: vive una sola vez en el
//   #business de www. Duplicarla en otro host fragmenta la entidad local.
// ──────────────────────────────────────────────────────────────────────

// @id CANÓNICO de la marca, anclado a www. Idéntico al de airsoft-app.
const ORG_ID = `${SITE_URL}/#organization`;
const SHOP_SITE_ID = `${SHOP_URL}/#website`;
const STORE_ID = `${SHOP_URL}/#store`;
const SAME_AS = [INSTAGRAM_URL, INSTAGRAM_MAIN_URL, YOUTUBE_URL].filter(Boolean);

export function SiteJsonLd() {
  const graph = [
    // Nodo de referencia a la Organization canónica (mismo @id en los 3 hosts).
    {
      "@type": "Organization",
      "@id": ORG_ID,
      name: "Experiencia Airsoft",
      url: SITE_URL,
      // MISMA URL de logo que airsoft-app (host www) para que Google merge el
      // nodo Organization de los 3 hosts sin tratarlos como entidades distintas.
      logo: `${SITE_URL}/img/00_logo_principal.png`,
      sameAs: SAME_AS,
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
      "@id": SHOP_SITE_ID,
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
      "@type": "OnlineStore",
      "@id": STORE_ID,
      name: "Tienda Experiencia Airsoft",
      url: SHOP_URL,
      image: `${SHOP_URL}/icon.png`,
      telephone: WHATSAPP_NUMBER,
      priceRange: "$$",
      parentOrganization: { "@id": ORG_ID },
      sameAs: SAME_AS,
    },
  ];
  const data = { "@context": "https://schema.org", "@graph": graph };
  return (
    <script
      type="application/ld+json"
      // .replace(/</g, "\\u003c") sanitiza contra XSS (recomendado por la doc
      // de Next 16 para JSON-LD serializado con JSON.stringify).
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
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
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
