import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { calcOrder } from "@/lib/calc";
import { getOrderByCode, getSettings, signedUrls } from "@/lib/data";
import { PAYMENT_STATUS, rupiah, tanggal, waktu, waLink } from "@/lib/format";
import { getCustomerEmail } from "@/lib/session";
import { Nota } from "@/components/Nota";
import { ProofForm } from "@/components/ProofForm";
import { StatusSteps } from "@/components/StatusSteps";
import { Badge, Notice } from "@/components/ui";

export const metadata: Metadata = { title: "Rincian pesanan" };

export default async function OrderPage({
  params, searchParams,
}: { params: Promise<{ kode: string }>; searchParams: Promise<{ baru?: string }> }) {
  const [{ kode }, { baru }, email] = await Promise.all([params, searchParams, getCustomerEmail()]);
  if (!email) redirect("/lacak");

  const [order, settings] = await Promise.all([getOrderByCode(kode.toUpperCase()), getSettings()]);
  if (!order || order.email !== email) {
    return (
      <div className="sheet mx-auto mt-10 max-w-md p-6">
        <h1 className="text-[1.4rem] font-extrabold">Pesanan tidak ditemukan</h1>
        <p className="mt-2 text-muted">Kode <strong className="num text-ink">{kode}</strong> tidak ada di antara titipan atas email {email}.</p>
        <Link href="/pesanan" className="btn btn-primary mt-4">Kembali ke rekap titipan</Link>
      </div>
    );
  }

  const t = calcOrder(order, order.items, order.payments);
  const photos = await signedUrls([...order.items.map((i) => i.photo_path), ...order.payments.map((p) => p.proof_path)]);
  const canPay = order.status !== "batal" && t.payStatus !== "lunas";

  return (
    <div className="pt-6">
      <Link href="/pesanan" className="text-[0.9rem] font-bold text-cobalt underline underline-offset-2">Kembali ke rekap titipan</Link>

      {baru && (
        <div className="mt-4">
          <Notice tone="green">
            <strong>Titipan terkirim.</strong> Admin akan mengecek harga lalu menghubungimu lewat WhatsApp. Untuk melihat halaman ini lagi, cukup masukkan email <strong className="break-all">{order.email}</strong> di menu Rekap titipan.
          </Notice>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[0.9rem] text-muted">{order.trip.destination ? `${order.trip.destination}, ${order.trip.name}` : order.trip.name}</p>
          <h1 className="num text-[2.2rem] font-extrabold sm:text-[2.8rem]">{order.code}</h1>
        </div>
        <p className="text-[0.9rem] text-muted">Atas nama {order.name}, dikirim {tanggal(order.created_at, true)}</p>
      </div>

      <div className="sheet mt-5 p-5 sm:p-6">
        <StatusSteps status={order.status} />
        {(order.tracking_number || order.trip.arrival_date || order.admin_note) && (
          <dl className="mt-4 grid gap-3 border-t border-line pt-4 text-[0.92rem] sm:grid-cols-2">
            {order.trip.arrival_date && (
              <div><dt className="text-muted">Perkiraan barang tiba di Indonesia</dt><dd className="font-bold">{tanggal(order.trip.arrival_date, true)}</dd></div>
            )}
            {order.tracking_number && (
              <div><dt className="text-muted">Nomor resi</dt><dd className="num font-bold break-all">{order.tracking_number}</dd></div>
            )}
            {order.admin_note && (
              <div className="sm:col-span-2"><dt className="text-muted">Catatan dari admin</dt><dd className="whitespace-pre-line">{order.admin_note}</dd></div>
            )}
          </dl>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px] lg:items-start">
        <section aria-labelledby="rincian">
          <h2 id="rincian" className="mb-3 text-[1.3rem] font-extrabold">Rincian titipan</h2>
          <Nota order={order} photos={photos} />
        </section>

        <section aria-labelledby="bayar" className="space-y-4">
          <h2 id="bayar" className="text-[1.3rem] font-extrabold">Pembayaran</h2>

          {canPay && (
            <div className="sheet p-5">
              <h3 className="font-sans text-[1rem] font-extrabold tracking-normal">Transfer ke</h3>
              {settings.payment_info ? (
                <p className="num mt-1 whitespace-pre-line">{settings.payment_info}</p>
              ) : (
                <p className="mt-1 text-muted">Nomor rekening akan dikirim admin lewat WhatsApp.</p>
              )}
              {order.status === "baru" && (
                <p className="mt-3 rounded-lg bg-warn-wash px-3 py-2 text-[0.88rem] text-warn">
                  Total masih estimasi. Sebaiknya tunggu konfirmasi admin sebelum transfer.
                </p>
              )}
              <div className="mt-4 border-t border-line pt-4">
                <ProofForm code={order.code} suggested={t.priced ? Math.max(t.remaining - t.pending, 0) : 0} />
              </div>
            </div>
          )}

          {order.status !== "batal" && t.payStatus === "lunas" && (
            <Notice tone="green"><strong>Lunas.</strong> Terima kasih, pembayaranmu sudah kami terima semua.</Notice>
          )}

          {order.payments.length > 0 && (
            <div className="sheet p-5">
              <h3 className="font-sans text-[1rem] font-extrabold tracking-normal">Riwayat pembayaran</h3>
              <ul className="mt-3 space-y-3">
                {order.payments.map((p) => (
                  <li key={p.id} className="flex items-start justify-between gap-3 text-[0.92rem]">
                    <div className="min-w-0">
                      <p className="num font-bold">{rupiah(p.amount)}</p>
                      <p className="text-[0.84rem] text-muted">{waktu(p.created_at)}{p.note ? `, ${p.note}` : ""}</p>
                      {p.proof_path && photos[p.proof_path] && (
                        <a href={photos[p.proof_path]} target="_blank" rel="noreferrer" className="text-[0.84rem] font-semibold text-cobalt underline underline-offset-2">Lihat bukti</a>
                      )}
                    </div>
                    <Badge tone={PAYMENT_STATUS[p.status].tone}>{PAYMENT_STATUS[p.status].label}</Badge>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {settings.admin_whatsapp && (
            <a href={waLink(settings.admin_whatsapp, `Halo admin, saya mau tanya soal titipan ${order.code}.`)} target="_blank" rel="noreferrer" className="btn btn-line w-full">
              Tanya admin soal pesanan ini
            </a>
          )}
        </section>
      </div>
    </div>
  );
}
