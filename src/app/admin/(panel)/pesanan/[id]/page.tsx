import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { addPayment, deleteOrder, saveOrder } from "@/actions/admin";
import { calcOrder, lineFee, lineGoods } from "@/lib/calc";
import { getOrderById, signedUrls } from "@/lib/data";
import { ITEM_STATUS, ORDER_STATUS, PAY_STATUS, rupiah, tanggal, waLink } from "@/lib/format";
import { requireAdmin } from "@/lib/session";
import { ActionForm, ConfirmButton, SubmitButton } from "@/components/forms";
import { PaymentReview } from "@/components/PaymentReview";
import { Badge } from "@/components/ui";

export const metadata: Metadata = { title: "Rincian pesanan" };

export default async function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const order = await getOrderById(id);
  if (!order) notFound();

  const t = calcOrder(order, order.items, order.payments);
  const urls = await signedUrls([...order.items.map((i) => i.photo_path), ...order.payments.map((p) => p.proof_path)]);
  const cur = order.trip.currency;

  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
  const bill =
    `Halo ${order.name}, titipan ${order.code} (${order.trip.name}) sudah kami cek.\n\n` +
    order.items.filter((i) => i.status !== "kosong").map((i) => `• ${i.qty}× ${i.name}: ${rupiah(lineGoods(i.price, i.qty, order.rate) + lineFee(i.price, i.qty, order))}`).join("\n") +
    (t.shipping > 0 ? `\n• Ongkos kirim: ${rupiah(t.shipping)}` : "") +
    (t.otherCost !== 0 ? `\n• ${t.otherCost < 0 ? "Potongan" : "Biaya lain"}: ${rupiah(t.otherCost)}` : "") +
    `\n\nTotal: ${rupiah(t.total)}` +
    (t.paid > 0 ? `\nSudah dibayar: ${rupiah(t.paid)}\nSisa: ${rupiah(t.remaining)}` : "") +
    `\n\nRincian dan unggah bukti transfer: ${origin}/lacak (masukkan email ${order.email})`;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/pesanan" className="text-[0.9rem] font-bold text-cobalt underline underline-offset-2">Kembali ke daftar pesanan</Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="num text-[1.9rem] font-extrabold">{order.code}</h1>
          <Badge tone={ORDER_STATUS[order.status].tone}>{ORDER_STATUS[order.status].label}</Badge>
          {order.status !== "batal" && <Badge tone={PAY_STATUS[t.payStatus].tone}>{PAY_STATUS[t.payStatus].label}</Badge>}
        </div>
        <p className="text-[0.9rem] text-muted">
          <Link href={`/admin/trip/${order.trip_id}`} className="underline underline-offset-2">{order.trip.name}</Link>, masuk {tanggal(order.created_at, true)}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px] lg:items-start">
        <ActionForm action={saveOrder} className="space-y-5">
          <input type="hidden" name="id" value={order.id} />

          <section className="sheet">
            <h2 className="px-5 pt-5 text-[1.2rem] font-extrabold">Barang</h2>
            <p className="px-5 text-[0.86rem] text-muted">Isi harga satuan sesuai harga di toko. Barang berstatus Tidak tersedia tidak dihitung ke tagihan.</p>
            <div className="mt-3 overflow-x-auto">
              <table className="table">
                <thead><tr><th>Barang</th><th>Jml</th><th>Harga satuan ({cur})</th><th>Status</th><th className="text-right">Tagihan</th></tr></thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item.id}>
                      <td className="min-w-56">
                        <input type="hidden" name="item_id" value={item.id} />
                        <div className="flex gap-3">
                          {item.photo_path && urls[item.photo_path] && (
                            <a href={urls[item.photo_path]} target="_blank" rel="noreferrer" className="shrink-0">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={urls[item.photo_path]} alt={`Foto ${item.name}`} className="h-12 w-12 rounded-lg border border-line object-cover" />
                            </a>
                          )}
                          <div className="min-w-0">
                            <p className="font-bold break-words">{item.name}</p>
                            {item.variant && <p className="text-[0.84rem] text-muted">{item.variant}</p>}
                            {item.note && <p className="text-[0.84rem] text-muted">Catatan: {item.note}</p>}
                            {item.link && <a href={item.link} target="_blank" rel="noreferrer nofollow" className="text-[0.84rem] font-semibold text-cobalt underline underline-offset-2">Buka link</a>}
                          </div>
                        </div>
                      </td>
                      <td><input name={`item_${item.id}_qty`} type="number" min={1} step={1} required defaultValue={item.qty} aria-label={`Jumlah ${item.name}`} className="field field-sm num w-16" /></td>
                      <td><input name={`item_${item.id}_price`} type="number" min={0} step="any" defaultValue={item.price ?? ""} placeholder="Belum ada" aria-label={`Harga satuan ${item.name}`} className="field field-sm num w-32" /></td>
                      <td>
                        <select key={item.status} name={`item_${item.id}_status`} defaultValue={item.status} aria-label={`Status ${item.name}`} className="field field-sm w-36">
                          {Object.entries(ITEM_STATUS).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
                        </select>
                      </td>
                      <td className="num text-right whitespace-nowrap">
                        {item.status === "kosong" ? "—" : item.price == null ? "Belum ada harga" : rupiah(lineGoods(item.price, item.qty, order.rate) + lineFee(item.price, item.qty, order))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="sheet grid gap-4 p-5 sm:grid-cols-2">
            <h2 className="text-[1.2rem] font-extrabold sm:col-span-2">Status dan biaya</h2>
            <div>
              <label className="label" htmlFor="status">Status pesanan</label>
              <select key={order.status} id="status" name="status" className="field" defaultValue={order.status}>
                {Object.entries(ORDER_STATUS).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
              </select>
              <p className="hint">Ubah ke Dikonfirmasi setelah semua harga final, supaya pelanggan tahu tagihannya sudah pasti.</p>
            </div>
            <div>
              <label className="label" htmlFor="tracking_number">Nomor resi</label>
              <input id="tracking_number" name="tracking_number" maxLength={80} className="field num" defaultValue={order.tracking_number ?? ""} placeholder="Misal: JNE 0123456789" />
            </div>
            <div>
              <label className="label" htmlFor="rate">Kurs pesanan ini (Rp per 1 {cur})</label>
              <input id="rate" name="rate" type="number" step="any" min="0" required className="field num" defaultValue={order.rate} />
            </div>
            <div className="grid grid-cols-[1fr_120px] gap-2">
              <div>
                <label className="label" htmlFor="fee_type">Fee</label>
                <select key={order.fee_type} id="fee_type" name="fee_type" className="field" defaultValue={order.fee_type}>
                  <option value="persen">Persen dari harga</option>
                  <option value="flat">Rupiah per barang</option>
                </select>
              </div>
              <div>
                <label className="label" htmlFor="fee_value">Besar fee</label>
                <input id="fee_value" name="fee_value" type="number" step="any" min="0" required className="field num" defaultValue={order.fee_value} />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="shipping">Ongkos kirim (Rp)</label>
              <input id="shipping" name="shipping" inputMode="numeric" className="field num" defaultValue={order.shipping} />
            </div>
            <div>
              <label className="label" htmlFor="other_cost">Biaya lain atau potongan (Rp)</label>
              <input id="other_cost" name="other_cost" inputMode="numeric" className="field num" defaultValue={order.other_cost} />
              <p className="hint">Isi angka minus untuk potongan, misal -10000.</p>
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="admin_note">Catatan untuk pelanggan</label>
              <textarea id="admin_note" name="admin_note" maxLength={1000} className="field" defaultValue={order.admin_note ?? ""} placeholder="Tampil di halaman pesanan pelanggan" />
            </div>
          </section>

          <SubmitButton>Simpan perubahan</SubmitButton>
        </ActionForm>

        <aside className="space-y-5">
          <section className="sheet p-5">
            <h2 className="text-[1.1rem] font-extrabold">Pemesan</h2>
            <dl className="mt-3 space-y-2 text-[0.92rem]">
              <div><dt className="text-muted">Nama</dt><dd className="font-bold">{order.name}</dd></div>
              <div><dt className="text-muted">Email</dt><dd className="break-all">{order.email}</dd></div>
              <div><dt className="text-muted">WhatsApp</dt><dd className="num">{order.whatsapp}</dd></div>
              {order.address && <div><dt className="text-muted">Alamat kirim</dt><dd className="whitespace-pre-line">{order.address}</dd></div>}
              {order.note && <div><dt className="text-muted">Pesan dari pemesan</dt><dd className="whitespace-pre-line">{order.note}</dd></div>}
            </dl>
            <div className="mt-4 grid gap-2">
              <a href={waLink(order.whatsapp, bill)} target="_blank" rel="noreferrer" className="btn btn-tag">Kirim tagihan lewat WhatsApp</a>
              <a href={waLink(order.whatsapp)} target="_blank" rel="noreferrer" className="btn btn-line">Buka chat WhatsApp</a>
            </div>
          </section>

          <section className="sheet p-5">
            <h2 className="text-[1.1rem] font-extrabold">Tagihan</h2>
            <dl className="num mt-3 space-y-1.5 text-[0.92rem]">
              <div className="flex justify-between gap-3"><dt>Harga barang</dt><dd>{rupiah(t.goods)}</dd></div>
              <div className="flex justify-between gap-3"><dt>Fee jastip</dt><dd>{rupiah(t.fee)}</dd></div>
              <div className="flex justify-between gap-3"><dt>Ongkos kirim</dt><dd>{rupiah(t.shipping)}</dd></div>
              {t.otherCost !== 0 && <div className="flex justify-between gap-3"><dt>{t.otherCost < 0 ? "Potongan" : "Biaya lain"}</dt><dd>{rupiah(t.otherCost)}</dd></div>}
              <div className="flex justify-between gap-3 border-t border-line pt-2 text-[1.02rem] font-extrabold"><dt>Total</dt><dd>{rupiah(t.total)}</dd></div>
              <div className="flex justify-between gap-3"><dt>Sudah dibayar</dt><dd>{rupiah(t.paid)}</dd></div>
              <div className="flex justify-between gap-3 font-extrabold"><dt>Sisa</dt><dd>{rupiah(t.remaining)}</dd></div>
            </dl>
            {!t.priced && <p className="mt-3 rounded-lg bg-warn-wash px-3 py-2 text-[0.84rem] text-warn">Masih ada barang tanpa harga. Total belum final.</p>}
          </section>

          <section className="sheet p-5">
            <h2 className="text-[1.1rem] font-extrabold">Pembayaran</h2>
            {order.payments.length === 0 ? (
              <p className="mt-2 text-[0.9rem] text-muted">Belum ada pembayaran atau bukti transfer.</p>
            ) : (
              <ul className="mt-3 space-y-4">
                {order.payments.map((p) => (
                  <li key={p.id}><PaymentReview payment={p} proofUrl={p.proof_path ? urls[p.proof_path] : undefined} /></li>
                ))}
              </ul>
            )}
            <div className="mt-4 border-t border-line pt-4">
              <h3 className="font-sans text-[0.92rem] font-extrabold tracking-normal">Catat pembayaran manual</h3>
              <p className="hint mt-0 mb-2">Untuk pembayaran tunai atau transfer yang tidak diunggah pelanggan.</p>
              <ActionForm action={addPayment} className="space-y-2">
                <input type="hidden" name="order_id" value={order.id} />
                <input name="amount" inputMode="numeric" required className="field field-sm num" placeholder="Jumlah (Rp)" aria-label="Jumlah pembayaran" />
                <input name="note" maxLength={300} className="field field-sm" placeholder="Keterangan, misal: tunai saat COD" aria-label="Keterangan pembayaran" />
                <SubmitButton className="btn btn-line btn-sm">Catat pembayaran</SubmitButton>
              </ActionForm>
            </div>
          </section>

          <form action={deleteOrder}>
            <input type="hidden" name="id" value={order.id} />
            <ConfirmButton message={`Hapus pesanan ${order.code} beserta barang dan catatan pembayarannya? Tindakan ini tidak bisa dibatalkan.`}>Hapus pesanan</ConfirmButton>
          </form>
        </aside>
      </div>
    </div>
  );
}
