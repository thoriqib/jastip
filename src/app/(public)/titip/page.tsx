import type { Metadata } from "next";
import Link from "next/link";
import { getTrips } from "@/lib/data";
import { tripIsOpen } from "@/lib/format";
import { getCustomerEmail } from "@/lib/session";
import { OrderForm } from "@/components/OrderForm";

export const metadata: Metadata = { title: "Titip barang" };

export default async function TitipPage({ searchParams }: { searchParams: Promise<{ trip?: string }> }) {
  const [{ trip }, trips, email] = await Promise.all([searchParams, getTrips(), getCustomerEmail()]);
  const open = trips.filter(tripIsOpen);

  return (
    <div className="pt-6">
      <h1 className="text-[2rem] font-extrabold sm:text-[2.5rem]">Titip barang</h1>
      {open.length === 0 ? (
        <div className="sheet mt-6 p-6">
          <p className="font-bold">Belum ada trip yang buka, jadi form titipan belum bisa diisi.</p>
          <p className="mt-1 text-muted">Cek halaman depan untuk jadwal berikutnya.</p>
          <Link href="/" className="btn btn-line mt-4">Kembali ke halaman depan</Link>
        </div>
      ) : (
        <>
          <p className="mt-2 mb-6 max-w-prose text-muted">
            Isi barang yang kamu mau. Setelah terkirim, admin mengecek harga dan menghubungimu lewat WhatsApp.
          </p>
          <OrderForm trips={open} initialTrip={trip} initialEmail={email ?? undefined} />
        </>
      )}
    </div>
  );
}
