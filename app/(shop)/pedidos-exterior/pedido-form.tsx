"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2, Loader2, Send, AlertTriangle } from "lucide-react";
import { track } from "@/lib/ga";

type Status = "idle" | "submitting" | "success" | "error";

interface FieldErrors {
  [field: string]: string | undefined;
}

export function PedidoForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (status === "submitting") return;
    setStatus("submitting");
    setGeneralError(null);
    setFieldErrors({});

    const formData = new FormData(e.currentTarget);
    const payload = {
      nombre: String(formData.get("nombre") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim(),
      whatsapp: String(formData.get("whatsapp") ?? "").trim(),
      productUrl: String(formData.get("productUrl") ?? "").trim(),
      productName: String(formData.get("productName") ?? "").trim(),
      qty: Number(formData.get("qty") ?? 1) || 1,
      variant: String(formData.get("variant") ?? "").trim() || undefined,
      notes: String(formData.get("notes") ?? "").trim() || undefined,
      terms: formData.get("terms") === "on",
      website: String(formData.get("website") ?? ""), // honeypot
    };

    try {
      const res = await fetch("/api/pedidos-exterior", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        url?: string;
        error?: string;
        issues?: { field: string; message: string }[];
      };
      if (!res.ok || !data.ok) {
        if (data.issues) {
          const fe: FieldErrors = {};
          for (const issue of data.issues) {
            fe[issue.field] = issue.message;
          }
          setFieldErrors(fe);
        }
        setGeneralError(data.error ?? "No pudimos registrar tu pedido.");
        setStatus("error");
        return;
      }
      if (data.url) {
        // Lead real (el honeypot anti-bot devuelve ok SIN url: no cuenta).
        // Se dispara ANTES del window.open para que el hit salga seguro.
        track("generate_lead", { lead_type: "pedido_exterior" });
        setWhatsappUrl(data.url);
        // Intento de auto-open. Si el browser bloquea el popup, el botón
        // de fallback en el success state queda visible para el usuario.
        window.open(data.url, "_blank", "noopener");
      }
      setStatus("success");
    } catch (err) {
      console.error("[pedidos-exterior] submit failed", err);
      setGeneralError(
        "No hay conexión con el servidor. Probá de nuevo en un rato.",
      );
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div className="border border-orange/50 bg-orange/10 clip-notch p-8 md:p-10 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-orange/20 border border-orange/50 mb-5">
          <CheckCircle2 size={28} className="text-orange" aria-hidden />
        </div>
        <p className="sect-label">Pedido cargado</p>
        <h3 className="sect-title fluid-3xl mt-3">¡Te abrimos WhatsApp!</h3>
        <p className="text-ash fluid-base mt-3 max-w-prose mx-auto">
          Te llevamos a WhatsApp con el pedido ya armado. Mandanos el
          mensaje y te respondemos con la cotización detallada en horas
          hábiles.
        </p>
        {whatsappUrl ? (
          <a
            href={whatsappUrl}
                    data-ga-destino="pedido_exterior"
            target="_blank"
            rel="noopener"
            className="mt-6 btn-wa clip-tag uppercase tracking-wider fluid-base px-5 py-3 inline-flex items-center justify-center gap-2"
          >
            <Send size={16} aria-hidden /> Abrir WhatsApp
          </a>
        ) : null}
        <button
          type="button"
          onClick={() => {
            setStatus("idle");
            setGeneralError(null);
            setFieldErrors({});
            setWhatsappUrl(null);
          }}
          className="block mx-auto mt-5 fluid-xs uppercase tracking-widest text-bone hover:text-orange transition-colors"
        >
          Cargar otro pedido →
        </button>
      </div>
    );
  }

  const isSubmitting = status === "submitting";

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="border border-bone/10 bg-carbon clip-notch p-6 md:p-8 space-y-6"
    >
      {/* Honeypot — bots lo llenan, humanos no lo ven. */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: "-10000px",
          width: "1px",
          height: "1px",
          overflow: "hidden",
        }}
      >
        <label>
          Si sos humano, dejá esto vacío
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
          />
        </label>
      </div>

      <fieldset className="space-y-4">
        <legend className="sect-label">1 · Tus datos</legend>
        <div className="grid md:grid-cols-2 gap-4">
          <Field
            name="nombre"
            label="Nombre completo"
            required
            autoComplete="name"
            error={fieldErrors.nombre}
          />
          <Field
            name="email"
            type="email"
            label="Email (opcional)"
            autoComplete="email"
            error={fieldErrors.email}
          />
        </div>
        <Field
          name="whatsapp"
          type="tel"
          label="WhatsApp (con código de área)"
          placeholder="+54 9 11 ..."
          required
          autoComplete="tel"
          error={fieldErrors.whatsapp}
        />
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="sect-label">2 · Qué querés traer</legend>
        <Field
          name="productUrl"
          type="url"
          label="URL del producto en arsenalsports.com"
          placeholder="https://arsenalsports.com/..."
          hint="Pegá el link del producto en arsenalsports.com — solo aceptamos pedidos de ese sitio."
          pattern="https?://(www\.)?arsenalsports\.com/.+"
          required
          error={fieldErrors.productUrl}
        />
        <Field
          name="productName"
          label="Nombre / descripción del producto"
          placeholder="Ej: Tokyo Marui MWS GBBR Gas Block"
          required
          error={fieldErrors.productName}
        />
        <div className="grid md:grid-cols-3 gap-4">
          <Field
            name="qty"
            type="number"
            min={1}
            max={20}
            defaultValue={1}
            label="Cantidad"
            required
            error={fieldErrors.qty}
          />
          <Field
            name="variant"
            label="Variante / talle / color"
            placeholder="Opcional"
            error={fieldErrors.variant}
            className="md:col-span-2"
          />
        </div>
        <Field
          name="notes"
          label="Notas o aclaraciones"
          placeholder="Detalles, links alternativos, urgencia, etc."
          multiline
          error={fieldErrors.notes}
        />
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="sect-label">3 · Confirmación</legend>
        <label className="flex items-start gap-3 fluid-sm text-ash cursor-pointer">
          <input
            type="checkbox"
            name="terms"
            required
            className="mt-1 accent-orange w-4 h-4 shrink-0"
          />
          <span>
            Entiendo que se cobra un{" "}
            <strong className="text-bone">30% mínimo</strong> sobre el valor
            del producto, que la seña equivale al valor del producto en el
            exterior y que el saldo se abona cuando llega.
          </span>
        </label>
        {fieldErrors.terms ? (
          <p className="fluid-xs text-orange">{fieldErrors.terms}</p>
        ) : null}
      </fieldset>

      {generalError ? (
        <div className="flex items-start gap-2 fluid-xs text-orange border border-orange/40 bg-orange/10 px-3 py-2">
          <AlertTriangle size={14} aria-hidden className="mt-0.5 shrink-0" />
          <span>{generalError}</span>
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full btn-wa clip-tag uppercase tracking-wider fluid-base px-5 py-4 inline-flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-wait"
      >
        {isSubmitting ? (
          <>
            <Loader2 size={16} className="animate-spin" aria-hidden />
            Enviando…
          </>
        ) : (
          <>
            <Send size={16} aria-hidden />
            Enviar pedido
          </>
        )}
      </button>

      <p className="fluid-xs text-smoke text-center">
        Sin compromiso — primero te cotizamos, después decidís si avanzás.
      </p>
    </form>
  );
}

function Field({
  name,
  label,
  type = "text",
  placeholder,
  required,
  defaultValue,
  autoComplete,
  hint,
  error,
  multiline,
  min,
  max,
  step,
  pattern,
  className,
}: {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: string | number;
  autoComplete?: string;
  hint?: string;
  error?: string;
  multiline?: boolean;
  min?: number;
  max?: number;
  step?: number;
  pattern?: string;
  className?: string;
}) {
  const baseInput =
    "w-full bg-ink/60 border text-bone fluid-sm px-3 py-3 outline-none transition-colors placeholder:text-smoke";
  const borderCls = error
    ? "border-orange focus:border-orange"
    : "border-bone/15 focus:border-orange";

  return (
    <label className={`block space-y-1.5 ${className ?? ""}`}>
      <span className="font-mono fluid-xs uppercase tracking-widest text-ash">
        {label}
        {required ? <span className="text-orange ml-1">*</span> : null}
      </span>
      {multiline ? (
        <textarea
          name={name}
          placeholder={placeholder}
          rows={4}
          maxLength={2000}
          required={required}
          defaultValue={defaultValue}
          className={`${baseInput} ${borderCls} resize-y min-h-[110px]`}
        />
      ) : (
        <input
          name={name}
          type={type}
          placeholder={placeholder}
          required={required}
          defaultValue={defaultValue}
          autoComplete={autoComplete}
          min={min}
          max={max}
          step={step}
          pattern={pattern}
          className={`${baseInput} ${borderCls}`}
        />
      )}
      {hint ? (
        <span className="block font-mono fluid-xs text-smoke">{hint}</span>
      ) : null}
      {error ? (
        <span className="block fluid-xs text-orange">{error}</span>
      ) : null}
    </label>
  );
}
