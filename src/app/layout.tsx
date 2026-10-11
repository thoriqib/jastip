import type { Metadata, Viewport } from "next";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/plus-jakarta-sans";
import "./globals.css";

// Semua halaman membaca data langsung dari Supabase saat diminta.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "Jastip", template: "%s — Jastip" },
  description: "Titip belanja dari luar negeri. Isi form, pantau status, dan lihat rekap titipanmu.",
};

export const viewport: Viewport = { themeColor: "#edf0f7" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
