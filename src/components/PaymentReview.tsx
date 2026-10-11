import { deletePayment, reviewPayment } from "@/actions/admin";
import { PAYMENT_STATUS, rupiah, waktu } from "@/lib/format";
import type { Payment } from "@/lib/types";
import { ConfirmButton } from "./forms";
import { Badge } from "./ui";

/** Satu bukti pembayaran beserta tombol terima/tolak untuk admin. */
export function PaymentReview({ payment, proofUrl }: { payment: Payment; proofUrl?: string }) {
  return (
    <div className="flex gap-3">
      {proofUrl ? (
        <a href={proofUrl} target="_blank" rel="noreferrer" className="shrink-0" title="Buka bukti ukuran penuh">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={proofUrl} alt="Bukti transfer" className="h-24 w-20 rounded-lg border border-line object-cover" />
        </a>
      ) : (
        <div className="flex h-24 w-20 shrink-0 items-center justify-center rounded-lg border border-dashed border-line px-1 text-center text-[0.72rem] text-muted">Tanpa bukti</div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="num font-extrabold">{rupiah(payment.amount)}</p>
          <Badge tone={PAYMENT_STATUS[payment.status].tone}>{PAYMENT_STATUS[payment.status].label}</Badge>
        </div>
        <p className="text-[0.84rem] text-muted">{waktu(payment.created_at)}{payment.note ? `, ${payment.note}` : ""}</p>
        {payment.status === "menunggu" ? (
          <form action={reviewPayment} className="mt-2 flex flex-wrap items-end gap-2">
            <input type="hidden" name="id" value={payment.id} />
            <div>
              <label className="block text-[0.76rem] font-bold text-muted" htmlFor={`amt-${payment.id}`}>Nominal yang masuk (Rp)</label>
              <input id={`amt-${payment.id}`} name="amount" inputMode="numeric" defaultValue={payment.amount} className="field field-sm num w-36" />
            </div>
            <button name="decision" value="diterima" className="btn btn-primary btn-sm">Terima</button>
            <button name="decision" value="ditolak" className="btn btn-danger btn-sm">Tolak</button>
          </form>
        ) : (
          <form action={deletePayment} className="mt-2">
            <input type="hidden" name="id" value={payment.id} />
            <ConfirmButton message="Hapus catatan pembayaran ini?" className="text-[0.82rem] font-bold text-bad underline underline-offset-2">Hapus catatan</ConfirmButton>
          </form>
        )}
      </div>
    </div>
  );
}
