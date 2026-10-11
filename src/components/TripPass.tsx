import Link from "next/link";
import { lineFee, lineGoods } from "@/lib/calc";
import { feeText, foreign, rateText, rupiah, tanggal } from "@/lib/format";
import type { Trip } from "@/lib/types";

/** Nominal contoh yang "bulat" di mata uang trip, kira-kira setara Rp100–900 ribu. */
function sampleAmount(rate: number): number {
  return Math.pow(10, Math.round(Math.log10(200000 / rate)));
}

export function TripPass({ trip, cta = true }: { trip: Trip; cta?: boolean }) {
  const sample = sampleAmount(trip.rate);
  const sampleTotal = lineGoods(sample, 1, trip.rate) + lineFee(sample, 1, trip);
  return (
    <article className="pass">
      <div className="pass-body">
        <h3 className="text-[1.9rem] font-extrabold sm:text-[2.3rem]">{trip.destination || trip.name}</h3>
        {trip.destination && <p className="mt-1 font-semibold text-muted">{trip.name}</p>}
        <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 text-[0.92rem] sm:max-w-md">
          <div>
            <dt className="text-muted">Terakhir titip</dt>
            <dd className="font-bold">{trip.close_date ? tanggal(trip.close_date, true) : "Selama masih buka"}</dd>
          </div>
          <div>
            <dt className="text-muted">Perkiraan barang tiba</dt>
            <dd className="font-bold">{trip.arrival_date ? tanggal(trip.arrival_date, true) : "Menyusul"}</dd>
          </div>
        </dl>
        {trip.note && <p className="mt-4 max-w-prose text-[0.92rem] text-muted whitespace-pre-line">{trip.note}</p>}
        {cta && (
          <Link href={`/titip?trip=${trip.id}`} className="btn btn-primary mt-6">
            Titip di trip ini
          </Link>
        )}
      </div>
      <div className="pass-stub">
        <p className="text-[0.85rem] font-semibold">Kurs 1 {trip.currency}</p>
        <p className="num font-display text-[2rem] font-extrabold leading-none">Rp{rateText(trip.rate)}</p>
        <p className="mt-3 text-[0.85rem] font-semibold">Fee jastip</p>
        <p className="font-bold">{feeText(trip.fee_type, trip.fee_value)}</p>
        {trip.currency !== "IDR" && (
          <p className="num mt-4 border-t-[1.5px] border-ink/25 pt-3 text-[0.85rem]">
            Barang {foreign(sample, trip.currency)} jadi <strong>{rupiah(sampleTotal)}</strong> sudah termasuk fee.
          </p>
        )}
      </div>
    </article>
  );
}
