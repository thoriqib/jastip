import Link from "next/link";
import { calcOrder } from "@/lib/calc";
import { getOrders, getPendingPayments, getTrips } from "@/lib/data";
import { ORDER_STATUS, TRIP_STATUS, rupiah, tanggal, tripIsOpen, waktu } from "@/lib/format";
import { requireAdmin } from "@/lib/session";
import { Badge } from "@/components/ui";

export default async function AdminHome() {
  await requireAdmin();
  const [orders, pending, trips] = await Promise.all([getOrders(), getPendingPayments(), getTrips()]);
  const live = orders.filter((o) => o.status !== "batal");
  const rows = live.map((o) => ({ o, t: calcOrder(o, o.items, o.payments) }));
  const fresh = orders.filter((o) => o.status === "baru");
  const unpaid = rows.filter((r) => r.o.status !== "baru" && r.t.remaining > 0);
  const receivable = unpaid.reduce((s, r) => s + r.t.remaining, 0);
  const received = rows.reduce((s, r) => s + r.t.paid, 0);
  const activeTrips = trips.filter((t) => t.status === "buka" || t.status === "tutup");

  const tiles: [string, string, string, string][] = [
    ["Menunggu konfirmasi", `${fresh.length} pesanan`, "/admin/pesanan?status=baru", "Cek barang dan isi harga final"],
    ["Bukti transfer", `${pending.length} menunggu`, "/admin/pembayaran", "Verifikasi bukti yang masuk"],
    ["Belum dibayar", rupiah(receivable), "/admin/pesanan", `${unpaid.length} pesanan terkonfirmasi belum lunas`],
    ["Sudah diterima", rupiah(received), "/admin/pesanan", "Total pembayaran terverifikasi"],
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-[1.9rem] font-extrabold">Ringkasan</h1>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map(([label, value, href, hint]) => (
          <Link key={label} href={href} className="sheet block p-4 hover:border-ink">
            <p className="text-[0.86rem] font-bold text-muted">{label}</p>
            <p className="num mt-1 font-display text-[1.55rem] font-extrabold leading-tight">{value}</p>
            <p className="mt-1 text-[0.82rem] text-muted">{hint}</p>
          </Link>
        ))}
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-[1.25rem] font-extrabold">Pesanan yang perlu dikonfirmasi</h2>
          <Link href="/admin/pesanan" className="text-[0.9rem] font-bold text-cobalt underline underline-offset-2">Semua pesanan</Link>
        </div>
        {fresh.length === 0 ? (
          <p className="sheet p-5 text-muted">Tidak ada pesanan baru. Pesanan yang masuk dari form titipan akan muncul di sini.</p>
        ) : (
          <div className="sheet overflow-x-auto">
            <table className="table">
              <thead><tr><th>Kode</th><th>Pemesan</th><th>Trip</th><th>Barang</th><th>Masuk</th></tr></thead>
              <tbody>
                {fresh.slice(0, 10).map((o) => (
                  <tr key={o.id}>
                    <td><Link href={`/admin/pesanan/${o.id}`} className="num font-bold text-cobalt underline underline-offset-2">{o.code}</Link></td>
                    <td>{o.name}</td>
                    <td>{o.trip.name}</td>
                    <td className="num">{o.items.reduce((s, i) => s + i.qty, 0)} pcs</td>
                    <td className="whitespace-nowrap">{waktu(o.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-[1.25rem] font-extrabold">Trip berjalan</h2>
          <Link href="/admin/trip/baru" className="btn btn-primary btn-sm">Buat trip</Link>
        </div>
        {activeTrips.length === 0 ? (
          <p className="sheet p-5 text-muted">Belum ada trip yang berjalan. Buat trip supaya pelanggan bisa mulai titip.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {activeTrips.map((trip) => {
              const mine = rows.filter((r) => r.o.trip_id === trip.id);
              return (
                <Link key={trip.id} href={`/admin/trip/${trip.id}`} className="sheet block p-4 hover:border-ink">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-extrabold">{trip.name}</p>
                    <Badge tone={tripIsOpen(trip) ? "green" : "amber"}>{tripIsOpen(trip) ? "Buka" : TRIP_STATUS[trip.status === "buka" ? "tutup" : trip.status].label}</Badge>
                  </div>
                  <p className="num mt-1 text-[0.9rem] text-muted">
                    {mine.length} pesanan, {mine.reduce((s, r) => s + r.t.itemCount, 0)} pcs, total {rupiah(mine.reduce((s, r) => s + r.t.total, 0))}
                  </p>
                  {trip.close_date && <p className="text-[0.86rem] text-muted">Terakhir titip {tanggal(trip.close_date)}</p>}
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <p className="text-[0.82rem] text-muted">Status pesanan: {Object.values(ORDER_STATUS).map((s) => s.label).join(" → ")}.</p>
    </div>
  );
}
