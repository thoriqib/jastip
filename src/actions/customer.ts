"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/supabase";
import { getOrderByCode, getTrip, uploadImage } from "@/lib/data";
import { tripIsOpen } from "@/lib/format";
import { clearCustomerEmail, getCustomerEmail, normalizeEmail, setCustomerEmail } from "@/lib/session";

export interface ActionResult {
  error?: string;
  ok?: string;
}

const MAX_ITEMS = 20;
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // tanpa 0/O/1/I supaya mudah dibaca

function newCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return "JT-" + Array.from(bytes, (b) => CODE_CHARS[b % CODE_CHARS.length]).join("");
}

const text = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

function cleanLink(v: unknown): string | null {
  const s = text(v, 1000);
  if (!s) return null;
  const withScheme = /^https?:\/\//i.test(s) ? s : `https://${s}`;
  try {
    const u = new URL(withScheme);
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

interface ItemInput {
  name?: unknown;
  link?: unknown;
  variant?: unknown;
  qty?: unknown;
  price?: unknown;
  note?: unknown;
}

/** Pelanggan mengirim form titipan. */
export async function createOrder(formData: FormData): Promise<ActionResult> {
  // Honeypot: kolom tersembunyi yang hanya diisi bot.
  if (text(formData.get("website"), 100)) return { error: "Pesanan tidak bisa dikirim." };

  const name = text(formData.get("name"), 120);
  const email = normalizeEmail(formData.get("email"));
  const whatsapp = text(formData.get("whatsapp"), 30);
  const address = text(formData.get("address"), 600);
  const note = text(formData.get("note"), 1000);
  const tripId = text(formData.get("trip_id"), 40);

  if (!name) return { error: "Isi nama kamu." };
  if (!email) return { error: "Alamat email belum benar. Email ini dipakai untuk melacak pesananmu." };
  if (whatsapp.replace(/\D/g, "").length < 9) return { error: "Nomor WhatsApp belum benar." };

  let rawItems: ItemInput[];
  try {
    rawItems = JSON.parse(String(formData.get("items") ?? "[]"));
    if (!Array.isArray(rawItems)) throw new Error();
  } catch {
    return { error: "Data barang tidak terbaca. Muat ulang halaman lalu coba lagi." };
  }
  if (rawItems.length === 0) return { error: "Tambahkan minimal satu barang." };
  if (rawItems.length > MAX_ITEMS) return { error: `Maksimal ${MAX_ITEMS} barang per pesanan.` };

  const items = [];
  for (const [i, raw] of rawItems.entries()) {
    const itemName = text(raw.name, 200);
    if (!itemName) return { error: `Barang ke-${i + 1} belum punya nama.` };
    const qty = Math.floor(Number(raw.qty));
    if (!Number.isFinite(qty) || qty < 1 || qty > 999) return { error: `Jumlah barang ke-${i + 1} belum benar.` };
    let price: number | null = null;
    if (raw.price !== "" && raw.price != null) {
      price = Number(raw.price);
      if (!Number.isFinite(price) || price < 0 || price > 1e11) {
        return { error: `Harga barang ke-${i + 1} belum benar.` };
      }
    }
    if (raw.link && !cleanLink(raw.link)) return { error: `Link barang ke-${i + 1} tidak valid.` };
    items.push({
      position: i, name: itemName, link: cleanLink(raw.link), variant: text(raw.variant, 200) || null,
      qty, price, note: text(raw.note, 500) || null, photo_path: null as string | null,
    });
  }

  const trip = tripId ? await getTrip(tripId) : null;
  if (!trip || !tripIsOpen(trip)) {
    return { error: "Trip ini sudah tutup order. Pilih trip lain yang masih buka." };
  }

  // Unggah foto dulu, supaya kalau gagal belum ada pesanan setengah jadi.
  try {
    for (const item of items) {
      const file = formData.get(`photo_${item.position}`);
      if (file instanceof File && file.size > 0) item.photo_path = await uploadImage(file, "barang");
    }
  } catch (e) {
    return { error: (e as Error).message };
  }

  const supabase = db();
  let order: { id: string; code: string } | null = null;
  for (let attempt = 0; attempt < 5 && !order; attempt++) {
    const { data, error } = await supabase
      .from("orders")
      .insert({
        code: newCode(), trip_id: trip.id, name, email, whatsapp, address: address || null, note: note || null,
        rate: trip.rate, fee_type: trip.fee_type, fee_value: trip.fee_value,
      })
      .select("id, code")
      .single();
    if (data) order = data;
    else if (error?.code !== "23505") return { error: "Pesanan gagal disimpan. Coba lagi sebentar lagi." };
  }
  if (!order) return { error: "Pesanan gagal disimpan. Coba lagi sebentar lagi." };

  const { error: itemsError } = await supabase
    .from("order_items")
    .insert(items.map((i) => ({ ...i, order_id: order.id })));
  if (itemsError) {
    await supabase.from("orders").delete().eq("id", order.id);
    return { error: "Daftar barang gagal disimpan. Coba lagi sebentar lagi." };
  }

  await setCustomerEmail(email);
  revalidatePath("/admin", "layout");
  redirect(`/pesanan/${order.code}?baru=1`);
}

/** Pelanggan memasukkan email untuk melihat rekap pesanannya. */
export async function trackByEmail(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const email = normalizeEmail(formData.get("email"));
  if (!email) return { error: "Alamat email belum benar. Contoh: nama@gmail.com" };
  await setCustomerEmail(email);
  redirect("/pesanan");
}

export async function forgetEmail() {
  await clearCustomerEmail();
  redirect("/lacak");
}

/** Pelanggan mengunggah bukti transfer untuk salah satu pesanannya. */
export async function submitProof(formData: FormData): Promise<ActionResult> {
  const email = await getCustomerEmail();
  if (!email) return { error: "Sesi berakhir. Masukkan email kamu lagi di halaman Lacak pesanan." };

  const code = text(formData.get("code"), 20);
  const order = await getOrderByCode(code);
  if (!order || order.email !== email) return { error: "Pesanan tidak ditemukan." };
  if (order.status === "batal") return { error: "Pesanan ini sudah dibatalkan." };

  const amount = Math.round(Number(String(formData.get("amount") ?? "").replace(/[^\d]/g, "")));
  if (!Number.isFinite(amount) || amount < 1000) return { error: "Isi jumlah yang kamu transfer." };
  if (amount > 1e10) return { error: "Jumlah transfer terlalu besar." };

  const file = formData.get("proof");
  if (!(file instanceof File) || file.size === 0) return { error: "Lampirkan foto atau tangkapan layar bukti transfer." };

  if (order.payments.filter((p) => p.status === "menunggu").length >= 5) {
    return { error: "Masih ada 5 bukti yang menunggu verifikasi. Tunggu admin memeriksanya dulu." };
  }

  let path: string;
  try {
    path = await uploadImage(file, "bukti");
  } catch (e) {
    return { error: (e as Error).message };
  }

  const { error } = await db().from("payments").insert({
    order_id: order.id, amount, proof_path: path, note: text(formData.get("note"), 300) || null,
  });
  if (error) return { error: "Bukti gagal disimpan. Coba lagi sebentar lagi." };

  revalidatePath(`/pesanan/${order.code}`);
  revalidatePath("/admin", "layout");
  return { ok: "Bukti terkirim. Admin akan memverifikasinya." };
}
