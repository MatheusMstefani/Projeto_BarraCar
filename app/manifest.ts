import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest { return { name: "Barracar Gestão", short_name: "Barracar", start_url: "/", display: "standalone", background_color: "#f6f5f1", theme_color: "#14251f", icons: [] }; }
