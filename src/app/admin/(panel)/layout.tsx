import type { Metadata } from "next";
import Link from "next/link";
import { logout } from "@/actions/admin";
import { getPendingPayments, getSettings } from "@/lib/data";
import { requireAdmin } from "@/lib/session";
import { TagMark } from "@/components/ui";

export const metadata: Metadata = { title: { default: "Admin", template: "%s — Admin Jastip" }, robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const [settings, pending] = await Promise.all([getSettings(), getPendingPayments()]);
  const nav: [string, string, number?][] = [
    ["/admin", "Ringkasan"],
    ["/admin/pesanan", "Pesanan"],
    ["/admin/pembayaran", "Pembayaran", pending.length],
    ["/admin/trip", "Trip"],
    ["/admin/pengaturan", "Pengaturan"],
  ];
  return (
    <div className="min-h-dvh">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
          <Link href="/admin" className="flex items-center gap-2">
            <TagMark className="h-7 w-7" />
            <span className="font-display text-[1.15rem] font-extrabold leading-none">{settings.shop_name}</span>
            <span className="rounded-md bg-ink px-1.5 py-0.5 text-[0.7rem] font-bold text-white">Admin</span>
          </Link>
          <nav className="order-3 -mx-1 flex w-full gap-1 overflow-x-auto text-[0.9rem] font-bold sm:order-none sm:w-auto sm:flex-1" aria-label="Menu admin">
            {nav.map(([href, label, count]) => (
              <Link key={href} href={href} className="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 hover:bg-paper">
                {label}
                {count ? <span className="num rounded-full bg-tag px-1.5 text-[0.75rem] leading-5">{count}</span> : null}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/" target="_blank" className="btn btn-line btn-sm">Lihat situs</Link>
            <form action={logout}><button type="submit" className="btn btn-line btn-sm">Keluar</button></form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
