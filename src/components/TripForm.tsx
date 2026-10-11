import { saveTrip } from "@/actions/admin";
import { CURRENCIES, TRIP_STATUS } from "@/lib/format";
import type { Trip } from "@/lib/types";
import { ActionForm, SubmitButton } from "./forms";

// Catatan: setiap <select> diberi key = nilai tersimpan. Setelah form action selesai, React
// mengembalikan select ke pilihan awalnya; key membuat select dirender ulang dengan nilai terbaru.

export function TripForm({ trip }: { trip?: Trip }) {
  return (
    <ActionForm action={saveTrip} className="space-y-4">
      {trip && <input type="hidden" name="id" value={trip.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="name">Nama trip</label>
          <input id="name" name="name" required maxLength={120} className="field" defaultValue={trip?.name} placeholder="Misal: Trip Korea Desember 2026" />
        </div>
        <div>
          <label className="label" htmlFor="destination">Kota atau negara tujuan</label>
          <input id="destination" name="destination" maxLength={120} className="field" defaultValue={trip?.destination ?? ""} placeholder="Misal: Seoul & Busan" />
          <p className="hint">Tampil besar di kartu trip pada halaman depan.</p>
        </div>
        <div>
          <label className="label" htmlFor="currency">Mata uang harga barang</label>
          <select key={trip?.currency} id="currency" name="currency" className="field" defaultValue={trip?.currency ?? "KRW"}>
            {CURRENCIES.map(([code, label]) => <option key={code} value={code}>{code} — {label}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="rate">Kurs jual (Rupiah per 1 unit)</label>
          <input id="rate" name="rate" type="number" step="any" min="0" required className="field num" defaultValue={trip?.rate} placeholder="Misal: 12.5" />
          <p className="hint">Kurs yang kamu kenakan ke pelanggan. Untuk IDR isi 1.</p>
        </div>
        <div>
          <label className="label" htmlFor="fee_type">Cara hitung fee</label>
          <select key={trip?.fee_type} id="fee_type" name="fee_type" className="field" defaultValue={trip?.fee_type ?? "persen"}>
            <option value="persen">Persen dari harga barang</option>
            <option value="flat">Rupiah per barang (per pcs)</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="fee_value">Besar fee</label>
          <input id="fee_value" name="fee_value" type="number" step="any" min="0" required className="field num" defaultValue={trip?.fee_value ?? 10} />
          <p className="hint">Isi 10 untuk 10%, atau 25000 untuk Rp25.000 per barang.</p>
        </div>
        <div>
          <label className="label" htmlFor="close_date">Hari terakhir terima titipan</label>
          <input id="close_date" name="close_date" type="date" className="field" defaultValue={trip?.close_date ?? ""} />
          <p className="hint">Setelah tanggal ini form titipan tertutup otomatis.</p>
        </div>
        <div>
          <label className="label" htmlFor="arrival_date">Perkiraan barang tiba di Indonesia</label>
          <input id="arrival_date" name="arrival_date" type="date" className="field" defaultValue={trip?.arrival_date ?? ""} />
        </div>
        <div>
          <label className="label" htmlFor="status">Status trip</label>
          <select key={trip?.status} id="status" name="status" className="field" defaultValue={trip?.status ?? "buka"}>
            {Object.entries(TRIP_STATUS).map(([value, s]) => <option key={value} value={value}>{s.label}</option>)}
          </select>
          <p className="hint">Hanya trip berstatus Buka yang tampil di halaman depan.</p>
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="note">Keterangan untuk pelanggan</label>
          <textarea id="note" name="note" maxLength={1000} className="field" defaultValue={trip?.note ?? ""} placeholder="Misal: toko yang dikunjungi, barang yang tidak bisa dititip, batas berat" />
        </div>
      </div>
      {trip && (
        <label className="flex items-start gap-2.5 text-[0.92rem]">
          <input type="checkbox" name="apply_rate" className="mt-1 h-4 w-4 accent-cobalt" />
          <span>Terapkan kurs dan fee ini ke pesanan yang belum dikonfirmasi. Pesanan yang sudah dikonfirmasi tetap memakai kurs lamanya.</span>
        </label>
      )}
      <SubmitButton>{trip ? "Simpan trip" : "Buat trip"}</SubmitButton>
    </ActionForm>
  );
}
