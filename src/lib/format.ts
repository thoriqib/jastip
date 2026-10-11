import type { FeeType, ItemStatus, OrderStatus, PaymentStatus, Trip, TripStatus } from "./types";

const TZ = "Asia/Jakarta";

export function rupiah(n: number): string {
  return "Rp" + Math.round(n).toLocaleString("id-ID");
}

export function foreign(n: number | null, currency: string): string {
  if (n == null) return "—";
  return `${currency} ${Number(n).toLocaleString("id-ID", { maximumFractionDigits: 2 })}`;
}

export function rateText(rate: number): string {
  return Number(rate).toLocaleString("id-ID", { maximumFractionDigits: 4 });
}

export function feeText(type: FeeType, value: number): string {
  return type === "persen"
    ? `${Number(value).toLocaleString("id-ID", { maximumFractionDigits: 2 })}% dari harga barang`
    : `${rupiah(value)} per barang`;
}

export function feeShort(type: FeeType, value: number): string {
  return type === "persen"
    ? `${Number(value).toLocaleString("id-ID", { maximumFractionDigits: 2 })}%`
    : `${rupiah(value)}/pcs`;
}

/** "2026-12-05" → "5 Des 2026" */
export function tanggal(d: string | null | undefined, long = false): string {
  if (!d) return "—";
  const date = d.length <= 10 ? new Date(d + "T00:00:00+07:00") : new Date(d);
  return date.toLocaleDateString("id-ID", {
    day: "numeric", month: long ? "long" : "short", year: "numeric", timeZone: TZ,
  });
}

export function waktu(d: string): string {
  return new Date(d).toLocaleString("id-ID", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: TZ,
  });
}

/** Tanggal hari ini di WIB, format YYYY-MM-DD. */
export function todayWIB(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
}

export function tripIsOpen(t: Pick<Trip, "status" | "close_date">): boolean {
  return t.status === "buka" && (!t.close_date || todayWIB() <= t.close_date);
}

/** 0812… / +62 812… → 62812… (format wa.me) */
export function waNumber(raw: string | null | undefined): string {
  let d = (raw ?? "").replace(/\D/g, "");
  if (d.startsWith("0")) d = "62" + d.slice(1);
  else if (d.startsWith("8")) d = "62" + d;
  return d;
}

export function waLink(raw: string | null | undefined, text?: string): string {
  const n = waNumber(raw);
  return `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

export const ORDER_STATUS: Record<OrderStatus, { label: string; hint: string; tone: Tone }> = {
  baru: { label: "Menunggu konfirmasi", hint: "Admin sedang mengecek barang dan harganya.", tone: "amber" },
  dikonfirmasi: { label: "Dikonfirmasi", hint: "Harga sudah final. Silakan lakukan pembayaran.", tone: "blue" },
  dibeli: { label: "Sudah dibeli", hint: "Barang sudah dibeli dan menunggu dibawa pulang.", tone: "blue" },
  dikirim: { label: "Dikirim", hint: "Barang dalam perjalanan ke alamatmu.", tone: "blue" },
  selesai: { label: "Selesai", hint: "Barang sudah diterima.", tone: "green" },
  batal: { label: "Dibatalkan", hint: "Pesanan ini dibatalkan.", tone: "red" },
};
export const ORDER_FLOW: OrderStatus[] = ["baru", "dikonfirmasi", "dibeli", "dikirim", "selesai"];

export const ITEM_STATUS: Record<ItemStatus, { label: string; tone: Tone }> = {
  menunggu: { label: "Belum dibeli", tone: "gray" },
  dibeli: { label: "Dibeli", tone: "green" },
  kosong: { label: "Tidak tersedia", tone: "red" },
};

export const PAYMENT_STATUS: Record<PaymentStatus, { label: string; tone: Tone }> = {
  menunggu: { label: "Menunggu verifikasi", tone: "amber" },
  diterima: { label: "Diterima", tone: "green" },
  ditolak: { label: "Ditolak", tone: "red" },
};

export const PAY_STATUS: Record<"belum" | "dp" | "lunas", { label: string; tone: Tone }> = {
  belum: { label: "Belum bayar", tone: "gray" },
  dp: { label: "Bayar sebagian", tone: "amber" },
  lunas: { label: "Lunas", tone: "green" },
};

export const TRIP_STATUS: Record<TripStatus, { label: string; tone: Tone }> = {
  draf: { label: "Draf", tone: "gray" },
  buka: { label: "Buka", tone: "green" },
  tutup: { label: "Tutup order", tone: "amber" },
  selesai: { label: "Selesai", tone: "gray" },
};

export type Tone = "gray" | "amber" | "blue" | "green" | "red";

export const CURRENCIES = [
  ["KRW", "Won Korea"], ["JPY", "Yen Jepang"], ["SGD", "Dolar Singapura"], ["MYR", "Ringgit Malaysia"],
  ["THB", "Baht Thailand"], ["CNY", "Yuan Tiongkok"], ["USD", "Dolar AS"], ["EUR", "Euro"],
  ["GBP", "Pound Inggris"], ["AUD", "Dolar Australia"], ["HKD", "Dolar Hong Kong"], ["TWD", "Dolar Taiwan"],
  ["SAR", "Riyal Saudi"], ["IDR", "Rupiah (tanpa konversi)"],
] as const;
