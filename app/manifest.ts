import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Barracar Estética Automotiva",
    short_name: "Barracar Gestão",
    start_url: "/",
    display: "standalone",
    background_color: "#12131a",
    theme_color: "#2563eb",
    // A logo horizontal oficial não deve ser comprimida em um ícone quadrado.
    icons: [],
  };
}
