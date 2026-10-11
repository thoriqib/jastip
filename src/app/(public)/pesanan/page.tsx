import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { forgetEmail } from "@/actions/customer";
import { calcOrder } from "@/lib/calc";
import { getOrdersByEmail } from "@/lib/data";
import { ORDER_STATUS, PAY_STATUS, rupiah, tanggal } from "@/lib/format";
import { getCustomerEmail } from "@/lib/session";
import { Badge } from "@/components/ui";

export const metadata: Metadata = { title: "Rekap titipan" };

export default async function RekapPage() {
  const email = await getCustomerEmail();
  if (!email) redirect("/lacak");

  const orders = await getOrdersByEmail(email);
  const rows = orders.map((o) => ({ o, t: calcOrder(o, o.items, o.payments) }));
  const live = rows.filter((r) => r.o.status !== "batal");
  const sum = live.reduce(
    (s, r) => ({ total: s.total + r.t.total, paid: s.paid + r.t.paid, remaining: s.remaining + r.t.remaining, items: s.items + r.t.itemCount }),
    { total: 0, paid: 0, remaining: 0, items: 0 },
  );

  return (
    <div className="pt-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[2rem] font-extrabold sm:text-[2.5rem]">Rekap titipan</h1>
          <p className="mt-1 text-muted">Semua titipan atas email <strong className="text-ink break-all">{email}</strong></p>
        </div>
        <form action={forgetEmail}>
          <button type="submit" className="btn btn-line btn-sm">Pakai email lain</button>
        </form>
      </div>

      {orders.length === 0 ? (
        <div className="sheet mt-6 p-6">
          <p className="font-bold">Belum ada titipan dengan email ini.</p>
          <p className="mt-1 max-w-prose text-muted">Periksa lagi ejaan emailnya, atau mulai titipan pertamamu.</p>
          <Link href="/titip" className="btn btn-primary mt-4">Titip barang</Link>
        </div>
      ) : (
        <>
          <dl className="mt-6 grid grid-cols-2 overflow-hidden rounded-2xl border border-line bg-white sm:grid-cols-4">
            {[
              ["Jumlah barang", `${sum.items} pcs`, ""],
              ["Total tagihan", rupiah(sum.total), ""],
              ["Sudah dibayar", rupiah(sum.paid), "text-ok"],
              ["Sisa yang harus dibayar", rupiah(sum.remaining), sum.remaining > 0 ? "text-bad" : "text-ok"],
            ].map(([label, value, color], i) => (
              <div key={label} className={`p-4 sm:p-5 ${i % 2 === 1 ? "border-l border-line" : ""} ${i >= 2 ? "border-t border-line sm:border-t-0" : ""} ${i === 2 ? "sm:border-l" : ""}`}>
                <dt className="text-[0.84rem] text-muted">{label}</dt>
                <dd className={`num mt-0.5 font-display text-[1.35rem] font-extrabold leading-tight sm:text-[1.6rem] ${color}`}>{value}</dd>
              </div>
            ))}
          </dl>

          <ul className="mt-6 space-y-3">
            {rows.map(({ o, t }) => (
              <li key={o.id}>
                <Link href={`/pesanan/${o.code}`} className="sheet block p-4 hover:border-ink sm:p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="num font-display text-[1.2rem] font-extrabold">{o.code}</p>
                      <p className="text-[0.9rem] text-muted">{o.trip.destination || o.trip.name}, dikirim {tanggal(o.created_at)}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="num font-extrabold">{rupiah(t.total)}</p>
                      {o.status !== "batal" && t.paid > 0 && t.remaining > 0 && <p className="num text-[0.86rem] text-muted">sisa {rupiah(t.remaining)}</p>}
                    </div>
                  </div>
                  <p className="mt-2 text-[0.92rem] break-words">
                    {o.items.slice(0, 3).map((i) => `${i.qty}× ${i.name}`).join(", ")}
                    {o.items.length > 3 ? `, dan ${o.items.length - 3} barang lain` : ""}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge tone={ORDER_STATUS[o.status].tone}>{ORDER_STATUS[o.status].label}</Badge>
                    {o.status !== "batal" && <Badge tone={PAY_STATUS[t.payStatus].tone}>{PAY_STATUS[t.payStatus].label}</Badge>}
                    {t.pending > 0 && <Badge tone="amber">Bukti sedang dicek</Badge>}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/titip" className="btn btn-primary mt-6">Titip barang lagi</Link>
        </>
      )}
    </div>
  );
}
