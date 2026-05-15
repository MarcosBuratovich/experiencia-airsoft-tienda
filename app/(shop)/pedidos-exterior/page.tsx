import type { Metadata } from "next";
import Link from "next/link";
import {
  Check,
  X,
  Clock,
  PackageSearch,
  Calculator,
  Send,
  Truck,
  AlertCircle,
} from "lucide-react";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { WHATSAPP_URL } from "@/app/_components/site-constants";
import { PedidoForm } from "./pedido-form";

export const metadata: Metadata = {
  title: "Pedidos del exterior",
  description:
    "Encargá productos de USA: óptica, accesorios, protección, ropa táctica. Te traemos lo que no se consigue en Argentina. Cotización sin compromiso.",
  alternates: { canonical: "/pedidos-exterior" },
};

const STEPS = [
  {
    icon: Send,
    title: "Enviás el link",
    desc: "Pegás la URL del producto (arsenalsports.com u otra tienda USA) y nos contás qué necesitás.",
  },
  {
    icon: Calculator,
    title: "Te cotizamos",
    desc: "En 24–48 hs te respondemos con el valor final estimado en pesos: producto + envío + gestión.",
  },
  {
    icon: PackageSearch,
    title: "Señás y compramos",
    desc: "Si te conviene, señás con un link de MercadoPago. Compramos y embarcamos al hub en Florida.",
  },
  {
    icon: Truck,
    title: "Llega y te avisamos",
    desc: "En 4–8 semanas el producto pasa Aduana y te lo entregamos por courier o retiro en CABA.",
  },
];

const COVERED = [
  "Compra del producto en la tienda USA",
  "Envío al hub de consolidación en Florida",
  "Embarque internacional y courier al país",
  "Gestión aduanera + tracking",
];

const NOT_COVERED = [
  "Impuestos de Aduana (50% sobre CIF + adicionales)",
  "Percepción de AFIP cuando corresponda",
  "Diferencia por variación del USD entre cotización y embarque",
  "Devoluciones (riesgo de Aduana queda con el cliente)",
];

const BRING = [
  "Óptica · miras red dot · scopes",
  "Protección · anteojos · cascos",
  "Accesorios · grips · slings · pouches",
  "Ropa táctica · BDU · botas",
  "Repuestos · gearbox · barriles · hop-up",
  "BBs · gases · baterías compatibles courier",
];

const NO_BRING = [
  "Marcadoras potentes (revisamos caso a caso por ANMAC)",
  "Productos > USD 3.000 (cupo anual courier por DNI)",
  "Sustancias peligrosas (gases / litio sin certificación)",
];

const FAQS = [
  {
    q: "¿Por qué el 30% es solo el mínimo?",
    a: "Depende del peso, del valor del producto y de qué courier termine cursando el envío (DHL/FedEx/UPS). Productos chicos y livianos suelen quedar en 30–35%, los voluminosos o caros pueden ir hasta 45–50% según ese mix.",
  },
  {
    q: "¿Y los impuestos de Aduana?",
    a: "Van aparte del 30% y los pagás vos. Aduana cobra ~50% sobre el valor declarado (CIF) cuando el courier ingresa el paquete; te avisamos antes para que decidas si avanzar o no. Si el envío se queda en franquicia chica (< USD 50, una sola vez al año), no aplica.",
  },
  {
    q: "¿Cuánto tarda?",
    a: "Entre 4 y 8 semanas desde que señás hasta que te lo entregamos. El cuello suele ser Aduana — si entra rápido sale en 4 semanas, si queda revisado puede irse a 6–8.",
  },
  {
    q: "¿Qué pasa si Aduana lo retiene o lo rechaza?",
    a: "Te explicamos qué documentación pide y la conseguimos juntos. Si el producto cae en una categoría que Aduana directamente no libera (ej: una marcadora sin habilitación ANMAC previa), te devolvemos el dinero del producto menos los gastos ya ejecutados (compra USA + envío internacional).",
  },
  {
    q: "¿Puedo pedir una marcadora?",
    a: "Lo conversamos antes de cotizar. La mayoría requiere habilitación de ANMAC y muchos couriers directamente no cursan armas tipo airsoft. Si ya tenés tu credencial de legítimo usuario o vas por una categoría no controlada, lo hacemos.",
  },
  {
    q: "¿Pago todo al principio?",
    a: "No. Primero seña del 50% para que arranquemos la compra. El otro 50% lo pagás cuando Aduana libera y antes de la entrega final. Todo por MercadoPago o transferencia.",
  },
];

export default function PedidosExteriorPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-bone/10">
        <div className="absolute inset-0 -z-10" aria-hidden>
          <div className="absolute inset-0 diag-lines opacity-80" />
          <div className="absolute -right-32 top-1/4 w-[420px] h-[420px] rounded-full bg-orange/20 blur-[120px] hero-glow" />
        </div>

        <div className="max-w-[1400px] mx-auto fluid-gutter-x py-[clamp(3rem,6vw,7rem)]">
          <Breadcrumbs
            items={[
              { href: "/", label: "Tienda" },
              { label: "Pedidos del exterior" },
            ]}
          />

          <div className="mt-8 max-w-3xl">
            <div className="hero-fade hero-fade-1 inline-flex items-center gap-3 sect-label">
              <span
                className="size-2 bg-orange rounded-full pulse-dot"
                aria-hidden
              />
              Servicio bajo pedido
            </div>
            <h1 className="sect-title mt-6 fluid-6xl leading-[0.88] tracking-tight">
              <span className="hero-word" style={{ animationDelay: "0.12s" }}>
                Lo que no está,
              </span>
              <br />
              <span
                className="hero-word text-orange"
                style={{ animationDelay: "0.28s" }}
              >
                te lo traemos.
              </span>
            </h1>
            <p className="hero-fade hero-fade-4 text-ash fluid-lg mt-6 max-w-prose">
              Productos de USA que no se consiguen en Argentina: óptica,
              accesorios, repuestos, ropa táctica. Mandás el link, te
              cotizamos sin compromiso y si te cierra, compramos.
            </p>
            <div className="hero-fade hero-fade-5 mt-6 inline-flex items-center gap-3 mil-tag bone">
              <Clock size={12} aria-hidden /> 4 – 8 semanas
              <span className="text-rail">·</span> Cotización en 24–48 hs
            </div>
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="max-w-[1400px] mx-auto fluid-gutter-x fluid-section-y">
        <div className="mb-10">
          <p className="sect-label">Proceso</p>
          <h2 className="sect-title fluid-4xl mt-2">Cómo funciona</h2>
        </div>
        <ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <li
                key={step.title}
                className="relative border border-bone/10 bg-carbon clip-notch p-6 flex flex-col"
              >
                <div className="flex items-center justify-between mb-4">
                  <Icon size={20} className="text-orange" aria-hidden />
                  <span className="font-mono fluid-xs tracking-widest text-smoke">
                    0{i + 1}
                  </span>
                </div>
                <h3 className="fluid-lg uppercase tracking-wide text-bone">
                  {step.title}
                </h3>
                <p className="text-ash fluid-sm mt-3">{step.desc}</p>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Qué incluye / Qué no */}
      <section className="max-w-[1400px] mx-auto fluid-gutter-x fluid-section-y border-t border-bone/10">
        <div className="mb-10">
          <p className="sect-label">Transparencia</p>
          <h2 className="sect-title fluid-4xl mt-2">
            Qué incluye el <span className="text-orange">30%</span>
          </h2>
          <p className="text-ash fluid-base mt-3 max-w-prose">
            El 30% mínimo es la gestión nuestra. Los impuestos van aparte y
            los pagás vos cuando Aduana los liquida.
          </p>
        </div>
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="border border-orange/30 bg-orange/[0.04] clip-notch p-6 md:p-8">
            <p className="mil-tag mb-4 w-fit">Cubre</p>
            <ul className="space-y-3">
              {COVERED.map((it) => (
                <li
                  key={it}
                  className="flex items-start gap-3 fluid-sm text-bone"
                >
                  <Check
                    size={16}
                    className="text-orange shrink-0 mt-0.5"
                    aria-hidden
                  />
                  <span>{it}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="border border-bone/15 bg-carbon clip-notch p-6 md:p-8">
            <p className="mil-tag bone mb-4 w-fit">No cubre</p>
            <ul className="space-y-3">
              {NOT_COVERED.map((it) => (
                <li
                  key={it}
                  className="flex items-start gap-3 fluid-sm text-ash"
                >
                  <X
                    size={16}
                    className="text-smoke shrink-0 mt-0.5"
                    aria-hidden
                  />
                  <span>{it}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Qué traemos / qué no */}
      <section className="max-w-[1400px] mx-auto fluid-gutter-x fluid-section-y border-t border-bone/10">
        <div className="mb-10">
          <p className="sect-label">Productos</p>
          <h2 className="sect-title fluid-4xl mt-2">Qué cursamos</h2>
        </div>
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="border border-bone/10 bg-carbon clip-notch p-6 md:p-8">
            <p className="sect-label mb-4">Sí — sale tranquilo</p>
            <ul className="space-y-2.5">
              {BRING.map((it) => (
                <li
                  key={it}
                  className="flex items-start gap-3 fluid-sm text-bone"
                >
                  <Check
                    size={14}
                    className="text-orange shrink-0 mt-1"
                    aria-hidden
                  />
                  <span>{it}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="border border-bone/10 bg-carbon clip-notch p-6 md:p-8">
            <p className="sect-label mb-4">Ojo — hablalo antes</p>
            <ul className="space-y-2.5">
              {NO_BRING.map((it) => (
                <li
                  key={it}
                  className="flex items-start gap-3 fluid-sm text-ash"
                >
                  <AlertCircle
                    size={14}
                    className="text-orange shrink-0 mt-1"
                    aria-hidden
                  />
                  <span>{it}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Form */}
      <section
        id="form"
        className="max-w-[1400px] mx-auto fluid-gutter-x fluid-section-y border-t border-bone/10"
      >
        <div className="grid lg:grid-cols-12 gap-10">
          <div className="lg:col-span-4">
            <p className="sect-label">Tu pedido</p>
            <h2 className="sect-title fluid-4xl mt-2">Pedí tu cotización</h2>
            <p className="text-ash fluid-base mt-4 max-w-prose">
              Completá el formulario con el link del producto que querés
              traer. Cuanta más info, más rápido te respondemos.
            </p>
            <p className="font-mono fluid-xs uppercase tracking-widest text-smoke mt-6">
              Tu pedido no genera cobro automático. Primero cotización.
            </p>
            <div className="mt-8 border-t border-bone/10 pt-6">
              <p className="sect-label mb-3">¿Dudas antes de pedir?</p>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener"
                className="btn-ghost clip-tag uppercase tracking-wider fluid-sm px-5 py-3 inline-flex items-center justify-center"
              >
                Escribinos por WhatsApp
              </a>
            </div>
          </div>
          <div className="lg:col-span-8">
            <PedidoForm />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-[1400px] mx-auto fluid-gutter-x fluid-section-y border-t border-bone/10">
        <div className="mb-10">
          <p className="sect-label">FAQ</p>
          <h2 className="sect-title fluid-4xl mt-2">Preguntas frecuentes</h2>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {FAQS.map((f, i) => (
            <details
              key={f.q}
              className="group border border-bone/10 bg-carbon clip-notch p-5 md:p-6 open:border-orange/40 transition-colors"
              {...(i < 2 ? { open: true } : {})}
            >
              <summary className="cursor-pointer fluid-base uppercase tracking-wide text-bone group-open:text-orange transition-colors list-none flex items-start justify-between gap-3">
                <span>{f.q}</span>
                <span
                  aria-hidden
                  className="font-mono fluid-xs text-smoke group-open:text-orange shrink-0 mt-1"
                >
                  +
                </span>
              </summary>
              <p className="text-ash fluid-sm mt-3 leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-bone/10">
        <div className="max-w-[1400px] mx-auto fluid-gutter-x py-12 text-center">
          <p className="sect-label">¿Listo?</p>
          <h2 className="sect-title fluid-3xl mt-2">
            Tirá el link, te cotizamos hoy
          </h2>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="#form"
              className="btn-wa clip-tag uppercase tracking-wider fluid-sm px-5 py-3 inline-flex items-center justify-center"
            >
              Ir al formulario
            </Link>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener"
              className="btn-ghost clip-tag uppercase tracking-wider fluid-sm px-5 py-3 inline-flex items-center justify-center"
            >
              O escribinos por WhatsApp
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
