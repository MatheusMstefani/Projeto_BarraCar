import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest { return { name: "Barracar Gestão", short_name: "Barracar", start_url: "/", display: "standalone", background_color: "#12131a", theme_color: "#2563eb", icons: [] }; }
