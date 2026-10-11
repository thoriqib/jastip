import type { Metadata } from "next";
import { getCustomerEmail } from "@/lib/session";
import { TrackForm } from "@/components/TrackForm";

export const metadata: Metadata = { title: "Lacak pesanan" };

export default async function LacakPage() {
  const email = await getCustomerEmail();
  return (
    <div className="mx-auto max-w-md pt-10">
      <h1 className="text-[2rem] font-extrabold">Lihat rekap titipanmu</h1>
      <p className="mt-2 mb-6 text-muted">
        Masukkan email yang kamu pakai saat mengisi form titipan. Tidak perlu kata sandi.
      </p>
      <div className="sheet p-5 sm:p-6">
        <TrackForm defaultEmail={email ?? undefined} />
      </div>
    </div>
  );
}
