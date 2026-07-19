import "./globals.css";
import "./phase2.css";
export const metadata = { title: "Barracar Gestão", description: "Gestão da Barracar Estética Automotiva", manifest: "/manifest.webmanifest" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="pt-BR"><body>{children}</body></html>; }
