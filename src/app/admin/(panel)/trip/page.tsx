import type { Metadata } from "next";
import Link from "next/link";
import { calcOrder } from "@/lib/calc";
import { getOrders, getTrips } from "@/lib/data";
import { TRIP_STATUS, feeShort, rateText, rupiah, tanggal, tripIsOpen } from "@/lib/format";
import { requireAdmin } from "@/lib/session";
import { Badge } from "@/components/ui";

export const metadata: Metadata = { title: "Trip" };

export default async function TripsPage() {
  await requireAdmin();
  const [trips, orders] = await Promise.all([getTrips(), getOrders()]);
  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-3">
        <h1 className="text-[1.9rem] font-extrabold">Trip</h1>
        <Link href="/admin/trip/baru" className="btn btn-primary">Buat trip</Link>
      </div>
      {trips.length === 0 ? (
        <div className="sheet p-6">
          <p className="font-bold">Belum ada trip.</p>
          <p className="mt-1 max-w-prose text-muted">Trip adalah satu batch belanja: tujuan, kurs, fee, dan batas waktu titip. Buat trip pertama supaya form titipan bisa diisi pelanggan.</p>
        </div>
      ) : (
        <div className="sheet overflow-x-auto">
          <table className="table">
            <thead><tr><th>Trip</th><th>Status</th><th>Kurs</th><th>Fee</th><th>Terakhir titip</th><th>Pesanan</th><th className="text-right">Total</th></tr></thead>
            <tbody>
              {trips.map((t) => {
                const mine = orders.filter((o) => o.trip_id === t.id && o.status !== "batal");
                const total = mine.reduce((s, o) => s + calcOrder(o, o.items).total, 0);
                const closedByDate = t.status === "buka" && !tripIsOpen(t);
                return (
                  <tr key={t.id}>
                    <td>
                      <Link href={`/admin/trip/${t.id}`} className="font-bold text-cobalt underline underline-offset-2">{t.name}</Link>
                      {t.destination && <p className="text-[0.84rem] text-muted">{t.destination}</p>}
                    </td>
                    <td>{closedByDate ? <Badge tone="amber">Lewat batas titip</Badge> : <Badge tone={TRIP_STATUS[t.status].tone}>{TRIP_STATUS[t.status].label}</Badge>}</td>
                    <td className="num whitespace-nowrap">1 {t.currency} = Rp{rateText(t.rate)}</td>
                    <td className="num whitespace-nowrap">{feeShort(t.fee_type, t.fee_value)}</td>
                    <td className="whitespace-nowrap">{tanggal(t.close_date)}</td>
                    <td className="num">{mine.length}</td>
                    <td className="num text-right whitespace-nowrap">{rupiah(total)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
