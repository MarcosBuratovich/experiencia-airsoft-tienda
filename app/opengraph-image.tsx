import {
  createOgImage,
  OG_SIZE,
  OG_CONTENT_TYPE,
} from "@/app/_components/og-template";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Tienda Experiencia Airsoft";

export default function OG() {
  return createOgImage({
    eyebrow: "TIENDA · EQUIPAMIENTO TACTICO",
    title: "Equipalo para la proxima partida",
    subtitle:
      "Marcadoras, BBs, proteccion y accesorios — Envios a todo el pais",
  });
}
