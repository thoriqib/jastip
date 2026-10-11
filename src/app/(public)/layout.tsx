import Link from "next/link";
import { getSettings } from "@/lib/data";
import { waLink } from "@/lib/format";
import { TagMark } from "@/components/ui";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-2.5">
          <TagMark className="h-8 w-8 shrink-0" />
          <span className="truncate font-display text-[1.2rem] font-extrabold leading-tight sm:text-[1.35rem]">{settings.shop_name}</span>
        </Link>
        <nav className="flex shrink-0 items-center text-[0.92rem] font-bold whitespace-nowrap sm:gap-2" aria-label="Menu utama">
          <Link href="/titip" className="rounded-lg px-2.5 py-2 hover:bg-white sm:px-3">Titip<span className="max-sm:sr-only"> barang</span></Link>
          <Link href="/pesanan" className="rounded-lg px-2.5 py-2 hover:bg-white sm:px-3">Rekap<span className="max-sm:sr-only"> titipan</span></Link>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16 sm:px-6">{children}</main>
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-5 text-[0.88rem] text-muted sm:px-6">
          <p>{settings.shop_name}</p>
          {settings.admin_whatsapp && (
            <a href={waLink(settings.admin_whatsapp)} target="_blank" rel="noreferrer" className="font-bold text-ink underline underline-offset-2">
              Hubungi admin lewat WhatsApp
            </a>
          )}
        </div>
      </footer>
    </div>
  );
}
