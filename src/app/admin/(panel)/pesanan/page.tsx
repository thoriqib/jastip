import type { Metadata } from "next";
import Link from "next/link";
import { calcOrder } from "@/lib/calc";
import { getOrders, getTrips } from "@/lib/data";
import { ORDER_STATUS, PAY_STATUS, rupiah, waktu } from "@/lib/format";
import { requireAdmin } from "@/lib/session";
import { Badge } from "@/components/ui";

export const metadata: Metadata = { title: "Pesanan" };

export default async function OrdersPage({
  searchParams,
}: { searchParams: Promise<{ q?: string; trip?: string; status?: string }> }) {
  await requireAdmin();
  const filter = await searchParams;
  const [orders, trips] = await Promise.all([getOrders(filter), getTrips()]);
  const filtered = !!(filter.q || filter.trip || filter.status);

  return (
    <div>
      <h1 className="mb-5 text-[1.9rem] font-extrabold">Pesanan</h1>

      <form className="sheet mb-4 grid gap-3 p-4 sm:grid-cols-[1fr_200px_200px_auto] sm:items-end">
        <div>
          <label className="label" htmlFor="q">Cari nama, email, kode, atau WhatsApp</label>
          <input id="q" name="q" className="field" defaultValue={filter.q ?? ""} />
        </div>
        <div>
          <label className="label" htmlFor="trip">Trip</label>
          <select id="trip" name="trip" className="field" defaultValue={filter.trip ?? ""}>
            <option value="">Semua trip</option>
            {trips.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="status">Status</label>
          <select id="status" name="status" className="field" defaultValue={filter.status ?? ""}>
            <option value="">Semua status</option>
            {Object.entries(ORDER_STATUS).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          <button type="submit" className="btn btn-primary">Terapkan</button>
          {filtered && <Link href="/admin/pesanan" className="btn btn-line">Hapus filter</Link>}
        </div>
      </form>

      {orders.length === 0 ? (
        <p className="sheet p-6 text-muted">
          {filtered ? "Tidak ada pesanan yang cocok dengan filter ini." : "Belum ada pesanan. Bagikan link situs ke pelanggan supaya mereka bisa mengisi form titipan."}
        </p>
      ) : (
        <div className="sheet overflow-x-auto">
          <table className="table">
            <thead>
              <tr><th>Kode</th><th>Pemesan</th><th>Trip</th><th>Barang</th><th className="text-right">Total</th><th className="text-right">Sisa</th><th>Pembayaran</th><th>Status</th><th>Masuk</th></tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const t = calcOrder(o, o.items, o.payments);
                return (
                  <tr key={o.id}>
                    <td><Link href={`/admin/pesanan/${o.id}`} className="num font-bold text-cobalt underline underline-offset-2">{o.code}</Link></td>
                    <td><p className="font-semibold">{o.name}</p><p className="text-[0.82rem] text-muted break-all">{o.email}</p></td>
                    <td>{o.trip.name}</td>
                    <td className="num">{t.itemCount} pcs</td>
                    <td className="num text-right whitespace-nowrap">{rupiah(t.total)}{!t.priced && <span title="Ada barang tanpa harga" className="text-warn"> *</span>}</td>
                    <td className="num text-right whitespace-nowrap">{rupiah(t.remaining)}</td>
                    <td>
                      <Badge tone={PAY_STATUS[t.payStatus].tone}>{PAY_STATUS[t.payStatus].label}</Badge>
                      {t.pending > 0 && <p className="mt-1 text-[0.8rem] font-bold text-warn">Ada bukti baru</p>}
                    </td>
                    <td><Badge tone={ORDER_STATUS[o.status].tone}>{ORDER_STATUS[o.status].label}</Badge></td>
                    <td className="whitespace-nowrap">{waktu(o.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {orders.some((o) => !calcOrder(o, o.items).priced) && <p className="mt-2 text-[0.82rem] text-muted">* Masih ada barang tanpa harga, total belum final.</p>}
    </div>
  );
}
