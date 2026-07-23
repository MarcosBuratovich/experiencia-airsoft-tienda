import type { Metadata, Viewport } from "next";
import { Anton, Oswald, Inter, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { ShopHeader } from "./_components/shop-header";
import { ShopFooter } from "./_components/shop-footer";
import { SHOP_URL } from "./_components/site-constants";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { SiteJsonLd } from "@/components/seo/site-jsonld";
import { MetaPixel } from "./_components/meta-pixel";
import { GoogleAnalytics } from "./_components/google-analytics";

const anton = Anton({
  variable: "--font-anton",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

const oswald = Oswald({
  variable: "--font-oswald",
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  display: "swap",
});

const TITLE = "Tienda Experiencia Airsoft — Marcadoras, BBs y equipamiento";
const DESCRIPTION =
  "Marcadoras AEG y GBB, BBs, protección, chalecos tácticos y accesorios para airsoft. Stock vivo y envíos a todo el país desde nuestro centro táctico en CABA.";

export const metadata: Metadata = {
  metadataBase: new URL(SHOP_URL),
  title: {
    default: TITLE,
    template: "%s · Tienda Experiencia Airsoft",
  },
  description: DESCRIPTION,
  applicationName: "Tienda Experiencia Airsoft",
  appleWebApp: {
    title: "Tienda EA",
    capable: true,
    statusBarStyle: "black-translucent",
  },
  keywords: [
    "tienda airsoft",
    "marcadoras airsoft",
    "BBs",
    "balines airsoft",
    "chaleco tactico",
    "anteojos proteccion",
    "AEG",
    "GBB",
    "accesorios airsoft",
    "Experiencia Airsoft",
    "airsoft Argentina",
    "airsoft Buenos Aires",
  ],
  authors: [{ name: "Experiencia Airsoft" }],
  creator: "Experiencia Airsoft",
  publisher: "Experiencia Airsoft",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "es_AR",
    url: SHOP_URL,
    siteName: "Tienda Experiencia Airsoft",
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
  category: "shopping",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  // Verificación de Google Search Console — setear GOOGLE_SITE_VERIFICATION
  // en Vercel con el código que da GSC al elegir "Etiqueta HTML".
  // Cuando no está, el meta tag no se renderiza.
  verification: process.env.GOOGLE_SITE_VERIFICATION
    ? { google: process.env.GOOGLE_SITE_VERIFICATION }
    : undefined,
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="es"
      data-scroll-behavior="smooth"
      className={`${anton.variable} ${oswald.variable} ${inter.variable} ${jetbrains.variable}`}
    >
      <body className="relative min-h-screen flex flex-col">
        <GoogleAnalytics />
        <MetaPixel />
        <SiteJsonLd />
        <ShopHeader />
        <main className="flex-1">{children}</main>
        <ShopFooter />
        <CartDrawer />
        <Analytics />
      </body>
    </html>
  );
}
