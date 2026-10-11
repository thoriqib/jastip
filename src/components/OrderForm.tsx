"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { createOrder } from "@/actions/customer";
import { lineFee, lineGoods } from "@/lib/calc";
import { feeText, rateText, rupiah, tanggal } from "@/lib/format";
import { compressImage } from "@/lib/image";
import type { Trip } from "@/lib/types";

interface Item {
  key: number;
  name: string;
  link: string;
  variant: string;
  qty: string;
  price: string;
  note: string;
  photo: File | null;
  preview: string | null;
}

const MAX_ITEMS = 20;
const MAX_UPLOAD = 3.6 * 1024 * 1024; // sisakan ruang di bawah batas 4 MB server action

const blank = (key: number): Item => ({ key, name: "", link: "", variant: "", qty: "1", price: "", note: "", photo: null, preview: null });

export function OrderForm({ trips, initialTrip, initialEmail }: { trips: Trip[]; initialTrip?: string; initialEmail?: string }) {
  const [tripId, setTripId] = useState(trips.find((t) => t.id === initialTrip)?.id ?? trips[0].id);
  const [items, setItems] = useState<Item[]>([blank(0)]);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const nextKey = useRef(1);
  const trip = trips.find((t) => t.id === tripId)!;

  const totals = useMemo(() => {
    let goods = 0, fee = 0, unpriced = 0;
    for (const i of items) {
      const qty = Math.max(1, Math.floor(Number(i.qty)) || 1);
      const price = i.price === "" ? null : Number(i.price);
      if (price == null || !Number.isFinite(price)) unpriced++;
      goods += lineGoods(price, qty, trip.rate);
      fee += lineFee(price, qty, trip);
    }
    return { goods, fee, unpriced };
  }, [items, trip]);

  const patch = (key: number, p: Partial<Item>) =>
    setItems((list) => list.map((i) => (i.key === key ? { ...i, ...p } : i)));

  async function pickPhoto(key: number, file: File | undefined) {
    if (!file) return patch(key, { photo: null, preview: null });
    try {
      const small = await compressImage(file);
      patch(key, { photo: small, preview: URL.createObjectURL(small) });
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("trip_id", tripId);
    fd.set("items", JSON.stringify(items.map(({ name, link, variant, qty, price, note }) => ({ name, link, variant, qty, price, note }))));
    let bytes = 0;
    items.forEach((item, idx) => {
      if (item.photo) { fd.set(`photo_${idx}`, item.photo); bytes += item.photo.size; }
    });
    if (bytes > MAX_UPLOAD) {
      setError("Total ukuran foto terlalu besar. Kurangi jumlah foto, sisanya bisa dikirim lewat WhatsApp.");
      return;
    }
    setError(null);
    start(async () => {
      try {
        const res = await createOrder(fd); // kalau berhasil, server langsung mengalihkan ke halaman pesanan
        if (res?.error) setError(res.error);
      } catch {
        setError("Pesanan gagal dikirim. Periksa koneksi internet lalu coba lagi.");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-start">
      <div className="space-y-6">
        {/* ── Trip ── */}
        <fieldset className="sheet p-5 sm:p-6">
          <legend className="sr-only">Trip</legend>
          <h2 className="text-[1.3rem] font-extrabold">Titip di trip mana?</h2>
          <div className="mt-4 grid gap-3">
            {trips.map((t) => (
              <label key={t.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border-[1.5px] p-4 ${t.id === tripId ? "border-cobalt bg-cobalt-wash" : "border-line bg-white"}`}>
                <input type="radio" name="trip_choice" checked={t.id === tripId} onChange={() => setTripId(t.id)} className="mt-1 h-4 w-4 accent-cobalt" />
                <span className="min-w-0">
                  <span className="block font-extrabold">{t.destination ? `${t.destination} — ${t.name}` : t.name}</span>
                  <span className="num block text-[0.88rem] text-muted">
                    1 {t.currency} = Rp{rateText(t.rate)}, fee {feeText(t.fee_type, t.fee_value)}
                    {t.close_date ? `, terakhir titip ${tanggal(t.close_date)}` : ""}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* ── Barang ── */}
        <section className="sheet p-5 sm:p-6">
          <h2 className="text-[1.3rem] font-extrabold">Barang yang mau dititip</h2>
          <p className="hint">Tempel link produknya atau unggah foto supaya barangnya tidak tertukar.</p>

          <div className="mt-5 space-y-6">
            {items.map((item, idx) => {
              const qty = Math.max(1, Math.floor(Number(item.qty)) || 1);
              const price = item.price === "" ? null : Number(item.price);
              const est = price != null && Number.isFinite(price) ? lineGoods(price, qty, trip.rate) + lineFee(price, qty, trip) : null;
              return (
                <div key={item.key} className={idx > 0 ? "border-t-[1.5px] border-dashed border-line pt-6" : ""}>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-sans text-[0.95rem] font-extrabold tracking-normal">Barang {idx + 1}</h3>
                    {items.length > 1 && (
                      <button type="button" className="text-[0.86rem] font-bold text-bad underline underline-offset-2" onClick={() => setItems((l) => l.filter((i) => i.key !== item.key))}>
                        Hapus barang ini
                      </button>
                    )}
                  </div>
                  <div className="grid gap-4 sm:grid-cols-6">
                    <div className="sm:col-span-6">
                      <label className="label" htmlFor={`name-${item.key}`}>Nama barang</label>
                      <input id={`name-${item.key}`} className="field" required maxLength={200} value={item.name} onChange={(e) => patch(item.key, { name: e.target.value })} placeholder="Misal: Sunscreen Beauty of Joseon 50 ml" />
                    </div>
                    <div className="sm:col-span-6">
                      <label className="label" htmlFor={`link-${item.key}`}>Link produk <span className="font-normal text-muted">(opsional)</span></label>
                      <input id={`link-${item.key}`} className="field" inputMode="url" maxLength={1000} value={item.link} onChange={(e) => patch(item.key, { link: e.target.value })} placeholder="https://…" />
                    </div>
                    <div className="sm:col-span-3">
                      <label className="label" htmlFor={`variant-${item.key}`}>Warna, ukuran, atau varian <span className="font-normal text-muted">(opsional)</span></label>
                      <input id={`variant-${item.key}`} className="field" maxLength={200} value={item.variant} onChange={(e) => patch(item.key, { variant: e.target.value })} placeholder="Misal: hitam, size M" />
                    </div>
                    <div className="sm:col-span-1">
                      <label className="label" htmlFor={`qty-${item.key}`}>Jumlah</label>
                      <input id={`qty-${item.key}`} className="field num" type="number" min={1} max={999} step={1} required value={item.qty} onChange={(e) => patch(item.key, { qty: e.target.value })} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="label" htmlFor={`price-${item.key}`}>Harga satuan ({trip.currency})</label>
                      <input id={`price-${item.key}`} className="field num" type="number" min={0} step="any" value={item.price} onChange={(e) => patch(item.key, { price: e.target.value })} placeholder="Boleh kosong" />
                    </div>
                    <div className="sm:col-span-3">
                      <label className="label" htmlFor={`photo-${item.key}`}>Foto barang <span className="font-normal text-muted">(opsional)</span></label>
                      <div className="flex items-center gap-3">
                        {item.preview && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.preview} alt="" className="h-11 w-11 shrink-0 rounded-lg border border-line object-cover" />
                        )}
                        <input id={`photo-${item.key}`} type="file" accept="image/*" className="field file:mr-3 file:rounded-md file:border-0 file:bg-cobalt-wash file:px-3 file:py-1 file:font-bold file:text-cobalt-deep" onChange={(e) => pickPhoto(item.key, e.target.files?.[0])} />
                      </div>
                    </div>
                    <div className="sm:col-span-3">
                      <label className="label" htmlFor={`note-${item.key}`}>Catatan barang <span className="font-normal text-muted">(opsional)</span></label>
                      <input id={`note-${item.key}`} className="field" maxLength={500} value={item.note} onChange={(e) => patch(item.key, { note: e.target.value })} placeholder="Misal: kalau habis, ganti warna krem" />
                    </div>
                  </div>
                  {est != null && (
                    <p className="num mt-3 text-[0.9rem] text-muted">Perkiraan untuk barang ini: <strong className="text-ink">{rupiah(est)}</strong> sudah termasuk fee.</p>
                  )}
                </div>
              );
            })}
          </div>

          {items.length < MAX_ITEMS && (
            <button type="button" className="btn btn-line mt-6" onClick={() => setItems((l) => [...l, blank(nextKey.current++)])}>
              Tambah barang lain
            </button>
          )}
        </section>

        {/* ── Pemesan ── */}
        <section className="sheet p-5 sm:p-6">
          <h2 className="text-[1.3rem] font-extrabold">Data kamu</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label" htmlFor="name">Nama</label>
              <input id="name" name="name" className="field" required maxLength={120} autoComplete="name" />
            </div>
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input id="email" name="email" type="email" className="field" required maxLength={254} autoComplete="email" defaultValue={initialEmail} placeholder="nama@gmail.com" />
              <p className="hint">Dipakai untuk melihat rekap titipanmu. Tidak perlu kata sandi.</p>
            </div>
            <div>
              <label className="label" htmlFor="whatsapp">Nomor WhatsApp</label>
              <input id="whatsapp" name="whatsapp" type="tel" className="field" required maxLength={30} autoComplete="tel" placeholder="0812…" />
              <p className="hint">Admin menghubungi kamu lewat nomor ini.</p>
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="address">Alamat pengiriman <span className="font-normal text-muted">(opsional)</span></label>
              <textarea id="address" name="address" className="field" maxLength={600} autoComplete="street-address" placeholder="Kosongkan kalau barang diambil langsung" />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="note">Pesan untuk admin <span className="font-normal text-muted">(opsional)</span></label>
              <textarea id="note" name="note" className="field" maxLength={1000} />
            </div>
          </div>
          {/* Jebakan bot: kolom ini tidak terlihat oleh manusia */}
          <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
            <label>Website <input name="website" tabIndex={-1} autoComplete="off" /></label>
          </div>
        </section>
      </div>

      {/* ── Ringkasan ── */}
      <aside className="lg:sticky lg:top-6">
        <div className="nota px-5 pt-5">
          <h2 className="text-[1.15rem] font-extrabold">Perkiraan biaya</h2>
          <dl className="num mt-4 space-y-1.5 text-[0.95rem]">
            <div className="flex justify-between gap-3"><dt>Harga barang</dt><dd>{rupiah(totals.goods)}</dd></div>
            <div className="flex justify-between gap-3"><dt>Fee jastip</dt><dd>{rupiah(totals.fee)}</dd></div>
          </dl>
          <div className="nota-rule my-4" />
          <div className="num flex justify-between gap-3 text-[1.15rem] font-extrabold">
            <span>Total sementara</span><span>{rupiah(totals.goods + totals.fee)}</span>
          </div>
          <p className="mt-3 text-[0.84rem] text-muted">
            {totals.unpriced > 0
              ? `${totals.unpriced} barang belum ada harganya, admin yang akan mengisi. `
              : ""}
            Belum termasuk ongkos kirim. Harga final dikonfirmasi admin sebelum kamu bayar.
          </p>
        </div>
        <div className="mt-5 space-y-3">
          {error && <p role="alert" className="rounded-lg bg-bad-wash px-3 py-2 text-[0.9rem] font-semibold text-bad">{error}</p>}
          <button type="submit" className="btn btn-primary w-full" disabled={pending}>
            {pending ? "Mengirim titipan…" : "Kirim titipan"}
          </button>
        </div>
      </aside>
    </form>
  );
}
