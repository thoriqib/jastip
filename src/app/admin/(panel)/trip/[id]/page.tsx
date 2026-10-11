import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteTrip, setItemStatus } from "@/actions/admin";
import { calcOrder } from "@/lib/calc";
import { getOrders, getTrip } from "@/lib/data";
import { ITEM_STATUS, foreign, rupiah } from "@/lib/format";
import { requireAdmin } from "@/lib/session";
import { ConfirmButton } from "@/components/forms";
import { TripForm } from "@/components/TripForm";
import { Badge, Notice } from "@/components/ui";

export const metadata: Metadata = { title: "Trip" };

export default async function TripPage({
  params, searchParams,
}: { params: Promise<{ id: string }>; searchParams: Promise<{ gagal?: string }> }) {
  await requireAdmin();
  const [{ id }, { gagal }] = await Promise.all([params, searchParams]);

  if (id === "baru") {
    return (
      <div className="max-w-3xl">
        <Link href="/admin/trip" className="text-[0.9rem] font-bold text-cobalt underline underline-offset-2">Kembali ke daftar trip</Link>
        <h1 className="mt-2 mb-5 text-[1.9rem] font-extrabold">Buat trip</h1>
        <div className="sheet p-5 sm:p-6"><TripForm /></div>
      </div>
    );
  }

  const trip = await getTrip(id);
  if (!trip) notFound();
  const orders = (await getOrders({ trip: id })).filter((o) => o.status !== "batal");
  const rows = orders.map((o) => ({ o, t: calcOrder(o, o.items, o.payments) }));
  const sum = rows.reduce((s, r) => ({ total: s.total + r.t.total, paid: s.paid + r.t.paid, fee: s.fee + r.t.fee }), { total: 0, paid: 0, fee: 0 });
  const shopping = orders.flatMap((o) => o.items.map((item) => ({ item, o })));
  const toBuy = shopping.filter((s) => s.item.status === "menunggu").length;

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin/trip" className="text-[0.9rem] font-bold text-cobalt underline underline-offset-2">Kembali ke daftar trip</Link>
        <h1 className="mt-2 text-[1.9rem] font-extrabold">{trip.name}</h1>
      </div>

      {gagal && <Notice tone="red">Trip ini masih punya pesanan, jadi tidak bisa dihapus. Ubah statusnya menjadi Selesai, atau hapus pesanannya dulu.</Notice>}

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["Pesanan", String(orders.length)],
          ["Total tagihan", rupiah(sum.total)],
          ["Sudah diterima", rupiah(sum.paid)],
          ["Pendapatan fee", rupiah(sum.fee)],
        ].map(([label, value]) => (
          <div key={label} className="sheet p-4">
            <dt className="text-[0.86rem] font-bold text-muted">{label}</dt>
            <dd className="num mt-1 font-display text-[1.4rem] font-extrabold leading-tight">{value}</dd>
          </div>
        ))}
      </dl>

      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-[1.25rem] font-extrabold">Daftar belanja</h2>
            <p className="text-[0.9rem] text-muted">{shopping.length === 0 ? "Belum ada barang." : `${toBuy} dari ${shopping.length} barang belum dibeli. Tandai langsung dari sini saat belanja.`}</p>
          </div>
          {shopping.length > 0 && <a href={`/admin/trip/${trip.id}/export`} className="btn btn-line btn-sm">Unduh CSV</a>}
        </div>
        {shopping.length > 0 && (
          <div className="sheet overflow-x-auto">
            <table className="table">
              <thead><tr><th>Barang</th><th>Jml</th><th>Harga satuan</th><th>Pemesan</th><th>Status</th><th>Tandai</th></tr></thead>
              <tbody>
                {shopping.map(({ item, o }) => (
                  <tr key={item.id}>
                    <td className="min-w-52">
                      <p className="font-bold">{item.name}</p>
                      {item.variant && <p className="text-[0.84rem] text-muted">{item.variant}</p>}
                      {item.note && <p className="text-[0.84rem] text-muted">Catatan: {item.note}</p>}
                      {item.link && <a href={item.link} target="_blank" rel="noreferrer nofollow" className="text-[0.84rem] font-semibold text-cobalt underline underline-offset-2">Buka link</a>}
                    </td>
                    <td className="num">{item.qty}</td>
                    <td className="num whitespace-nowrap">{foreign(item.price, trip.currency)}</td>
                    <td className="whitespace-nowrap">
                      <Link href={`/admin/pesanan/${o.id}`} className="font-semibold text-cobalt underline underline-offset-2">{o.name}</Link>
                      <p className="num text-[0.84rem] text-muted">{o.code}</p>
                    </td>
                    <td><Badge tone={ITEM_STATUS[item.status].tone}>{ITEM_STATUS[item.status].label}</Badge></td>
                    <td>
                      <form action={setItemStatus} className="flex gap-1.5">
                        <input type="hidden" name="id" value={item.id} />
                        {item.status !== "dibeli" && <button name="status" value="dibeli" className="btn btn-line btn-sm">Dibeli</button>}
                        {item.status !== "kosong" && <button name="status" value="kosong" className="btn btn-line btn-sm">Kosong</button>}
                        {item.status !== "menunggu" && <button name="status" value="menunggu" className="btn btn-line btn-sm">Batal tandai</button>}
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="max-w-3xl">
        <h2 className="mb-3 text-[1.25rem] font-extrabold">Pengaturan trip</h2>
        <div className="sheet p-5 sm:p-6"><TripForm trip={trip} /></div>
        <form action={deleteTrip} className="mt-4">
          <input type="hidden" name="id" value={trip.id} />
          <ConfirmButton message={`Hapus trip "${trip.name}"? Tindakan ini tidak bisa dibatalkan.`}>Hapus trip</ConfirmButton>
        </form>
      </section>
    </div>
  );
}
