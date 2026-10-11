import type { Metadata } from "next";
import { saveSettings } from "@/actions/admin";
import { getSettings } from "@/lib/data";
import { requireAdmin } from "@/lib/session";
import { ActionForm, SubmitButton } from "@/components/forms";

export const metadata: Metadata = { title: "Pengaturan" };

export default async function SettingsPage() {
  await requireAdmin();
  const s = await getSettings();
  return (
    <div className="max-w-2xl">
      <h1 className="mb-5 text-[1.9rem] font-extrabold">Pengaturan</h1>
      <ActionForm action={saveSettings} className="sheet space-y-4 p-5 sm:p-6">
        <div>
          <label className="label" htmlFor="shop_name">Nama jastip</label>
          <input id="shop_name" name="shop_name" required maxLength={60} className="field" defaultValue={s.shop_name} />
          <p className="hint">Tampil di pojok kiri atas situs.</p>
        </div>
        <div>
          <label className="label" htmlFor="tagline">Kalimat pembuka di halaman depan</label>
          <input id="tagline" name="tagline" maxLength={160} className="field" defaultValue={s.tagline ?? ""} placeholder="Kosongkan untuk memakai kalimat bawaan" />
        </div>
        <div>
          <label className="label" htmlFor="admin_whatsapp">Nomor WhatsApp admin</label>
          <input id="admin_whatsapp" name="admin_whatsapp" type="tel" maxLength={30} className="field num" defaultValue={s.admin_whatsapp ?? ""} placeholder="0812…" />
          <p className="hint">Pelanggan bisa menghubungi nomor ini dari halaman pesanan.</p>
        </div>
        <div>
          <label className="label" htmlFor="payment_info">Rekening tujuan transfer</label>
          <textarea id="payment_info" name="payment_info" maxLength={1000} className="field num" defaultValue={s.payment_info ?? ""} placeholder={"BCA 1234567890 a.n. Nama Pemilik\nDANA 0812xxxxxxxx a.n. Nama Pemilik"} />
          <p className="hint">Tampil di halaman pesanan pelanggan, di atas form unggah bukti.</p>
        </div>
        <SubmitButton>Simpan pengaturan</SubmitButton>
      </ActionForm>
      <p className="mt-4 text-[0.86rem] text-muted">
        Kata sandi admin diatur lewat environment variable <code className="rounded bg-white px-1">ADMIN_PASSWORD</code> di Vercel. Setelah menggantinya, deploy ulang; semua sesi admin lama otomatis keluar.
      </p>
    </div>
  );
}
