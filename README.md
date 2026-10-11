# Jastip

Aplikasi web jasa titip: pelanggan mengisi form titipan dan melihat rekap pesanannya cukup dengan email, admin mengelola trip, harga, pembayaran, dan status barang.

Dibuat dengan Next.js 16 (App Router), Tailwind CSS 4, dan Supabase (Postgres + Storage). Siap deploy ke Vercel.

## Fitur

**Pelanggan**
- Form titipan: pilih trip, tambah banyak barang (nama, link, varian, jumlah, harga, foto, catatan)
- Perkiraan biaya langsung dihitung: harga × kurs + fee jastip
- Rekap titipan dengan memasukkan email saja, tanpa kata sandi
- Rincian pesanan berbentuk nota, tahapan status, nomor resi
- Unggah bukti transfer (DP atau pelunasan) dan lihat riwayat pembayaran

**Admin** (`/admin`)
- Trip / batch PO: mata uang, kurs, fee (persen atau rupiah per barang), batas titip, perkiraan tiba
- Daftar belanja per trip, tandai barang dibeli atau kosong, unduh CSV
- Pesanan: isi harga final, ongkir, biaya lain atau potongan, ubah status, nomor resi
- Verifikasi bukti transfer, koreksi nominal, catat pembayaran manual
- Kirim tagihan ke pelanggan lewat WhatsApp dengan pesan yang sudah terisi
- Pengaturan nama jastip, nomor WhatsApp admin, rekening tujuan

## 1. Siapkan Supabase

1. Buat project baru di [supabase.com](https://supabase.com).
2. Buka **SQL Editor → New query**, tempel seluruh isi `supabase/schema.sql`, lalu **Run**.
   Skrip ini membuat 5 tabel, mengaktifkan RLS, dan membuat bucket storage privat `jastip`.
3. Catat dua nilai berikut:
   - **Project URL**: tombol **Connect** di bagian atas dashboard, atau **Settings → Data API**.
   - **Secret key** (`sb_secret_...`): **Settings → API Keys**. Kalau belum ada, buat dulu di halaman itu.
     Key lama `service_role` di halaman yang sama juga bisa dipakai.

> Pakai secret key, bukan publishable/anon key. Aplikasi ini mengakses database hanya dari server,
> dan RLS sengaja tidak diberi policy supaya key publik tidak bisa membaca apa pun.

## 2. Jalankan di komputer sendiri (opsional)

```bash
npm install
cp .env.example .env.local   # lalu isi tiga nilainya
npm run dev
```

Buka http://localhost:3000 untuk situs pelanggan dan http://localhost:3000/admin untuk admin.

## 3. Deploy ke Vercel

1. Unggah folder ini ke repository GitHub (`git init`, commit, push), lalu di Vercel pilih **Add New → Project** dan import repository-nya.
   Alternatif tanpa GitHub: jalankan `npx vercel` dari folder ini.
2. Di langkah **Environment Variables**, isi:

   | Nama | Isi |
   | --- | --- |
   | `SUPABASE_URL` | Project URL, misal `https://abcd1234.supabase.co` |
   | `SUPABASE_SERVICE_ROLE_KEY` | Secret key dari Supabase |
   | `ADMIN_PASSWORD` | Kata sandi admin. Pakai yang panjang dan acak |

3. Klik **Deploy**. Framework terdeteksi otomatis, tidak ada pengaturan build lain.

Kalau environment variable diubah belakangan, lakukan **Redeploy** supaya berlaku.

## 4. Mulai dipakai

1. Buka `/admin`, masuk dengan `ADMIN_PASSWORD`.
2. **Pengaturan**: isi nama jastip, nomor WhatsApp admin, dan rekening tujuan transfer.
3. **Trip → Buat trip**: isi tujuan, mata uang, kurs jual, fee, dan batas titip.
4. Bagikan alamat situs ke pelanggan.

Alur satu pesanan:

| Status | Artinya | Yang dilakukan admin |
| --- | --- | --- |
| Menunggu konfirmasi | Pesanan baru masuk, total masih estimasi | Cek barang, isi harga final dan ongkir |
| Dikonfirmasi | Harga final, pelanggan diminta bayar | Kirim tagihan lewat WhatsApp, verifikasi bukti |
| Sudah dibeli | Barang sudah di tangan jastiper | Tandai dari daftar belanja trip |
| Dikirim | Barang dikirim ke pelanggan | Isi nomor resi |
| Selesai | Barang diterima | — |

## Cara hitung tagihan

```
harga barang = harga satuan × jumlah × kurs          (dibulatkan per baris)
fee          = persen × harga barang, atau rupiah × jumlah
total        = harga barang + fee + ongkir + biaya lain
sisa         = total − pembayaran yang sudah diterima
```

Kurs dan fee disalin dari trip ke pesanan saat pesanan dibuat. Mengubah kurs trip tidak mengubah pesanan lama,
kecuali kamu mencentang "Terapkan kurs dan fee ini ke pesanan yang belum dikonfirmasi". Kurs satu pesanan juga
bisa diubah sendiri di halaman pesanan. Barang berstatus "Tidak tersedia" tidak ikut dihitung.

## Hal yang perlu diketahui

- **Pelacakan hanya dengan email.** Sesuai permintaan, tidak ada kata sandi atau kode verifikasi. Artinya siapa pun
  yang tahu email seorang pelanggan bisa melihat rekap titipannya (nama, alamat, barang, bukti transfer). Untuk jastip
  di lingkaran teman ini biasanya cukup. Kalau nanti perlu lebih ketat, tambahkan verifikasi kode lewat email
  (Supabase Auth OTP) di `src/actions/customer.ts` → `trackByEmail`.
- **Satu kata sandi admin.** Disimpan di environment variable, bukan di database. Mengganti `ADMIN_PASSWORD`
  otomatis mengeluarkan semua sesi admin.
- **Foto** dikompres di browser (sisi terpanjang 1400 px) sebelum diunggah, karena Vercel membatasi ukuran request
  4,5 MB. File tersimpan di bucket privat dan ditampilkan lewat URL sementara yang berlaku 1 jam.
- **Form titipan terbuka untuk umum** dan hanya dilindungi kolom jebakan bot. Kalau mulai ada spam, tambahkan
  CAPTCHA (misalnya Cloudflare Turnstile) di `createOrder`.
- Project Supabase gratis dijeda otomatis kalau lama tidak diakses. Buka dashboard Supabase untuk mengaktifkannya lagi.

## Struktur kode

```
supabase/schema.sql          skema database + bucket storage
src/app/(public)/            halaman pelanggan: depan, titip, lacak, pesanan
src/app/admin/               halaman admin
src/actions/customer.ts      server action pelanggan (buat pesanan, lacak, unggah bukti)
src/actions/admin.ts         server action admin
src/lib/calc.ts              rumus tagihan
src/lib/data.ts              semua query Supabase
src/lib/session.ts           cookie sesi admin dan email pelanggan
src/components/              komponen tampilan
```
