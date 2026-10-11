import { calcOrder, lineFee, lineGoods } from "@/lib/calc";
import { ITEM_STATUS, feeShort, foreign, rateText, rupiah } from "@/lib/format";
import type { OrderFull } from "@/lib/types";
import { Badge } from "./ui";

function Row({ label, value, strong, sub }: { label: React.ReactNode; value: string; strong?: boolean; sub?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between gap-4 ${strong ? "text-[1.05rem] font-extrabold" : ""} ${sub ? "text-muted" : ""}`}>
      <dt>{label}</dt>
      <dd className="num text-right">{value}</dd>
    </div>
  );
}

/** Rincian biaya satu pesanan dalam bentuk nota. */
export function Nota({ order, photos = {} }: { order: OrderFull; photos?: Record<string, string> }) {
  const t = calcOrder(order, order.items, order.payments);
  const cur = order.trip.currency;
  const estimate = order.status === "baru" || !t.priced;

  return (
    <div className="nota px-5 pt-5 sm:px-7 sm:pt-6">
      <ul className="space-y-4">
        {order.items.map((item) => {
          const gone = item.status === "kosong";
          const line = lineGoods(item.price, item.qty, order.rate);
          return (
            <li key={item.id} className="flex gap-3">
              {item.photo_path && photos[item.photo_path] ? (
                <a href={photos[item.photo_path]} target="_blank" rel="noreferrer" className="shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photos[item.photo_path]} alt={`Foto ${item.name}`} className="h-14 w-14 rounded-lg border border-line object-cover" />
                </a>
              ) : null}
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <p className={`font-bold break-words ${gone ? "text-muted line-through" : ""}`}>{item.name}</p>
                  <p className={`num shrink-0 font-bold ${gone ? "text-muted line-through" : ""}`}>
                    {item.price == null ? "Menunggu harga" : rupiah(line)}
                  </p>
                </div>
                <p className="num text-[0.86rem] text-muted">
                  {item.qty} × {item.price == null ? "harga belum ada" : foreign(item.price, cur)}
                  {item.variant ? `, ${item.variant}` : ""}
                </p>
                {item.note && <p className="text-[0.86rem] text-muted">Catatan: {item.note}</p>}
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                  {item.status !== "menunggu" && <Badge tone={ITEM_STATUS[item.status].tone}>{ITEM_STATUS[item.status].label}</Badge>}
                  {item.link && (
                    <a href={item.link} target="_blank" rel="noreferrer nofollow" className="text-[0.86rem] font-semibold text-cobalt underline underline-offset-2">
                      Buka link produk
                    </a>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="nota-rule my-5" />

      <dl className="space-y-1.5 text-[0.95rem]">
        <Row label={<>Harga barang <span className="text-muted">(kurs Rp{rateText(order.rate)})</span></>} value={rupiah(t.goods)} />
        <Row label={<>Fee jastip <span className="text-muted">({feeShort(order.fee_type, order.fee_value)})</span></>} value={rupiah(t.fee)} />
        {t.shipping > 0 && <Row label="Ongkos kirim" value={rupiah(t.shipping)} />}
        {t.otherCost !== 0 && <Row label={t.otherCost < 0 ? "Potongan" : "Biaya lain"} value={(t.otherCost < 0 ? "−" : "") + rupiah(Math.abs(t.otherCost))} />}
      </dl>

      <div className="nota-rule my-4" />

      <dl className="space-y-1.5 text-[0.95rem]">
        <Row label={estimate ? "Total sementara" : "Total"} value={rupiah(t.total)} strong />
        {t.paid > 0 && <Row label="Sudah dibayar" value={"−" + rupiah(t.paid)} />}
        {t.pending > 0 && <Row label="Menunggu verifikasi" value={rupiah(t.pending)} sub />}
        {t.paid > 0 && <Row label={t.payStatus === "lunas" ? "Lunas" : "Sisa tagihan"} value={rupiah(t.remaining)} strong />}
      </dl>

      {estimate && (
        <p className="mt-4 text-[0.86rem] text-muted">
          {t.priced
            ? "Angka ini masih estimasi. Harga final muncul setelah admin mengonfirmasi pesananmu."
            : "Sebagian barang belum punya harga, jadi total masih bisa bertambah."}
        </p>
      )}
    </div>
  );
}
