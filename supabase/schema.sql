-- Skema database aplikasi Jastip.
-- Jalankan sekali di Supabase → SQL Editor → New query → Run.
-- Aman dijalankan ulang (idempotent).

-- ───────────────────────── Pengaturan toko (satu baris) ─────────────────────────
create table if not exists public.settings (
  id             int primary key default 1 check (id = 1),
  shop_name      text not null default 'Jastip',
  tagline        text,
  admin_whatsapp text,
  payment_info   text,
  updated_at     timestamptz not null default now()
);
insert into public.settings (id) values (1) on conflict (id) do nothing;

-- ───────────────────────── Trip / batch PO ─────────────────────────
create table if not exists public.trips (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  destination  text,
  currency     text not null default 'KRW',
  rate         numeric(14,4) not null check (rate > 0),      -- 1 unit mata uang = Rp rate
  fee_type     text not null default 'persen' check (fee_type in ('persen','flat')),
  fee_value    numeric(14,2) not null default 0 check (fee_value >= 0),
  status       text not null default 'buka' check (status in ('draf','buka','tutup','selesai')),
  close_date   date,                                          -- hari terakhir terima titipan
  arrival_date date,                                          -- perkiraan barang tiba di Indonesia
  note         text,
  created_at   timestamptz not null default now()
);

-- ───────────────────────── Pesanan ─────────────────────────
create table if not exists public.orders (
  id              uuid primary key default gen_random_uuid(),
  code            text not null unique,
  trip_id         uuid not null references public.trips(id) on delete restrict,
  name            text not null,
  email           text not null,
  whatsapp        text not null,
  address         text,
  note            text,
  status          text not null default 'baru'
                  check (status in ('baru','dikonfirmasi','dibeli','dikirim','selesai','batal')),
  -- Kurs dan fee disalin dari trip saat pesanan dibuat, supaya tagihan
  -- yang sudah berjalan tidak ikut berubah kalau kurs trip diperbarui.
  rate            numeric(14,4) not null,
  fee_type        text not null check (fee_type in ('persen','flat')),
  fee_value       numeric(14,2) not null default 0,
  shipping        bigint not null default 0 check (shipping >= 0),
  other_cost      bigint not null default 0,
  tracking_number text,
  admin_note      text,
  created_at      timestamptz not null default now()
);
create index if not exists orders_email_idx on public.orders (email);
create index if not exists orders_trip_idx  on public.orders (trip_id);

-- ───────────────────────── Barang titipan ─────────────────────────
create table if not exists public.order_items (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.orders(id) on delete cascade,
  position   int  not null default 0,
  name       text not null,
  link       text,
  variant    text,
  qty        int  not null default 1 check (qty > 0),
  price      numeric(14,2) check (price is null or price >= 0), -- harga satuan dalam mata uang trip
  status     text not null default 'menunggu' check (status in ('menunggu','dibeli','kosong')),
  photo_path text,
  note       text,
  created_at timestamptz not null default now()
);
create index if not exists order_items_order_idx on public.order_items (order_id);

-- ───────────────────────── Pembayaran ─────────────────────────
create table if not exists public.payments (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.orders(id) on delete cascade,
  amount     bigint not null check (amount > 0),
  proof_path text,
  status     text not null default 'menunggu' check (status in ('menunggu','diterima','ditolak')),
  note       text,
  created_at timestamptz not null default now()
);
create index if not exists payments_order_idx on public.payments (order_id);

-- ───────────────────────── Keamanan ─────────────────────────
-- Semua akses data lewat server Next.js memakai secret/service_role key.
-- RLS diaktifkan TANPA policy, jadi anon/publishable key tidak bisa membaca apa pun.
alter table public.settings    enable row level security;
alter table public.trips       enable row level security;
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;
alter table public.payments    enable row level security;

revoke all on public.settings, public.trips, public.orders, public.order_items, public.payments
  from anon, authenticated;
grant all on public.settings, public.trips, public.orders, public.order_items, public.payments
  to service_role;

-- ───────────────────────── Storage ─────────────────────────
-- Bucket privat untuk foto barang dan bukti transfer (maks 5 MB, gambar saja).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('jastip', 'jastip', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
