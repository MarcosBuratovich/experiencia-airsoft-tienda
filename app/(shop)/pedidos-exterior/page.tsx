import type { Metadata } from "next";
import Link from "next/link";
import {
  PackageSearch,
  Calculator,
  Send,
  Truck,
} from "lucide-react";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { WHATSAPP_URL } from "@/app/_components/site-constants";
import { PedidoForm } from "./pedido-form";

export const metadata: Metadata = {
  title: "Pedidos del exterior",
  description:
    "Encargá productos de Brasil que no se consiguen en Argentina: marcadoras, BBs, óptica, repuestos, ropa táctica y más. Cotización sin compromiso.",
  alternates: { canonical: "/pedidos-exterior" },
};

const STEPS = [
  {
    icon: Send,
    title: "Enviás el link",
    desc: "Pegás la URL del producto (arsenalsports.com u otra tienda de Brasil) y nos contás qué necesitás.",
  },
  {
    icon: Calculator,
    title: "Te cotizamos",
    desc: "Te respondemos con el valor estimado en pesos y todos los detalles para que decidas si avanzás.",
  },
  {
    icon: PackageSearch,
    title: "Señás y compramos",
    desc: "Señás el valor del producto en el exterior por MercadoPago o transferencia y arrancamos la compra.",
  },
  {
    icon: Truck,
    title: "Llega y abonás el resto",
    desc: "Cuando el producto llega te avisamos, pagás lo que falta y coordinamos entrega o retiro en CABA.",
  },
];

const FAQS = [
  {
    q: "¿Qué productos puedo pedir?",
    a: "Lo que necesites: marcadoras, BBs, repuestos, gearbox, óptica, protección, accesorios, ropa táctica. Si tenés un link, te cotizamos.",
  },
  {
    q: "¿Cómo se paga?",
    a: "Seña = valor del producto en el exterior, vía MercadoPago o transferencia. El resto lo abonás cuando el producto llega y antes de la entrega.",
  },
  {
    q: "¿Cuánto cuesta el servicio?",
    a: "Cobramos un mínimo del 30% sobre el valor del producto. La cotización final te la pasamos por escrito antes de que sences cualquier cosa.",
  },
  {
    q: "¿Y si no llega o tengo un problema?",
    a: "Te acompañamos en todo el proceso y resolvemos juntos cualquier inconveniente. Cualquier duda, escribinos por WhatsApp antes o durante el pedido.",
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
              Productos de Brasil que no se consiguen en Argentina: marcadoras,
              BBs, repuestos, óptica, ropa táctica y todo lo que necesites.
              Mandás el link, te cotizamos sin compromiso y si te cierra,
              compramos.
            </p>
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
            Tirá el link y te cotizamos
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
