import "@fontsource-variable/manrope";
import "material-symbols/outlined.css";
import "./globals.css";

export const metadata = {
  title: "Barracar Gestão",
  applicationName: "Barracar Estética Automotiva",
  description: "Gestão da Barracar Estética Automotiva",
  manifest: "/manifest.webmanifest",
};

// Aplica o tema salvo antes da primeira pintura para evitar flash de tema errado.
const themeScript = `(function(){try{var t=localStorage.getItem("theme");var d=t?t==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("dark",d);}catch(e){}})();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {children}
      </body>
    </html>
  );
}
