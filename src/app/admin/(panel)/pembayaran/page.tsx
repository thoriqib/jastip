import type { Metadata } from "next";
import Link from "next/link";
import { getPendingPayments, signedUrls } from "@/lib/data";
import { requireAdmin } from "@/lib/session";
import { PaymentReview } from "@/components/PaymentReview";

export const metadata: Metadata = { title: "Pembayaran" };

export default async function PaymentsPage() {
  await requireAdmin();
  const pending = await getPendingPayments();
  const urls = await signedUrls(pending.map((p) => p.proof_path));
  return (
    <div className="max-w-3xl">
      <h1 className="text-[1.9rem] font-extrabold">Bukti transfer menunggu verifikasi</h1>
      <p className="mt-1 mb-5 text-muted">Cocokkan dengan mutasi rekening, koreksi nominalnya kalau berbeda, lalu terima atau tolak.</p>
      {pending.length === 0 ? (
        <p className="sheet p-6 text-muted">Semua bukti sudah diperiksa. Bukti baru dari pelanggan akan muncul di sini.</p>
      ) : (
        <ul className="space-y-3">
          {pending.map((p) => (
            <li key={p.id} className="sheet p-4">
              <p className="mb-3 text-[0.92rem]">
                <Link href={`/admin/pesanan/${p.order.id}`} className="num font-bold text-cobalt underline underline-offset-2">{p.order.code}</Link>
                <span className="text-muted"> atas nama </span><strong>{p.order.name}</strong>
              </p>
              <PaymentReview payment={p} proofUrl={p.proof_path ? urls[p.proof_path] : undefined} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
