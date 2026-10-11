import Link from "next/link";
import { getSettings, getTrips } from "@/lib/data";
import { tripIsOpen, waLink } from "@/lib/format";
import { getCustomerEmail } from "@/lib/session";
import { TripPass } from "@/components/TripPass";
import { TrackForm } from "@/components/TrackForm";

const STEPS = [
  ["Isi form titipan", "Tulis barang yang kamu mau, tempel link atau fotonya. Harga boleh dikosongkan kalau belum tahu."],
  ["Tunggu konfirmasi harga", "Admin mengecek barang dan mengisi harga final. Totalnya langsung terlihat dalam Rupiah."],
  ["Transfer dan unggah bukti", "Bayar DP atau lunas, lalu unggah bukti transfer di halaman pesananmu."],
  ["Barang dibeli dan dikirim", "Pantau statusnya dari sini sampai barang tiba di tanganmu."],
];

export default async function HomePage() {
  const [settings, trips, email] = await Promise.all([getSettings(), getTrips(), getCustomerEmail()]);
  const open = trips.filter(tripIsOpen);

  return (
    <>
      <section className="pt-8 pb-10 sm:pt-14">
        <h1 className="max-w-3xl text-[2.5rem] font-extrabold sm:text-[3.6rem]">
          Titip belanja dari luar negeri, bayar pakai Rupiah.
        </h1>
        <p className="mt-4 max-w-xl text-[1.05rem] text-muted">
          {settings.tagline ||
            "Kirim link atau foto barang yang kamu mau. Kami belikan langsung di sana, kamu pantau status dan tagihannya dari sini."}
        </p>
      </section>

      <section aria-labelledby="trip-buka">
        <h2 id="trip-buka" className="text-[1.45rem] font-extrabold">
          {open.length > 0 ? "Trip yang sedang buka" : "Belum ada trip yang buka"}
        </h2>
        {open.length > 0 ? (
          <div className="mt-5 space-y-5">
            {open.map((t) => <TripPass key={t.id} trip={t} />)}
          </div>
        ) : (
          <div className="sheet mt-5 p-6">
            <p className="max-w-prose">
              Jadwal trip berikutnya belum diumumkan. Kamu tetap bisa melihat rekap titipan yang sudah ada.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/pesanan" className="btn btn-primary">Lihat rekap titipan</Link>
              {settings.admin_whatsapp && (
                <a href={waLink(settings.admin_whatsapp, "Halo, kapan trip jastip berikutnya dibuka?")} target="_blank" rel="noreferrer" className="btn btn-line">
                  Tanya jadwal ke admin
                </a>
              )}
            </div>
          </div>
        )}
      </section>

      <section className="mt-14 grid gap-10 lg:grid-cols-[1fr_360px]" aria-labelledby="cara-kerja">
        <div>
          <h2 id="cara-kerja" className="text-[1.45rem] font-extrabold">Cara kerjanya</h2>
          <ol className="mt-5 space-y-5">
            {STEPS.map(([title, body], i) => (
              <li key={title} className="flex gap-4">
                <span className="num flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink font-display text-[1.05rem] font-extrabold text-white">{i + 1}</span>
                <div>
                  <h3 className="font-sans text-[1rem] font-extrabold tracking-normal">{title}</h3>
                  <p className="max-w-prose text-muted">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <div className="sheet self-start p-5 sm:p-6">
          <h2 className="text-[1.25rem] font-extrabold">Sudah pernah titip?</h2>
          <p className="mt-1 mb-4 text-[0.92rem] text-muted">Masukkan email yang kamu pakai saat titip untuk melihat rekap dan status pesananmu.</p>
          <TrackForm defaultEmail={email ?? undefined} />
        </div>
      </section>
    </>
  );
}
