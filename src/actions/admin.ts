"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/supabase";
import { checkAdminPassword, endAdminSession, requireAdmin, startAdminSession } from "@/lib/session";
import type { ActionResult } from "./customer";

const text = (v: unknown, max = 500) => String(v ?? "").trim().slice(0, max);
const nullable = (v: unknown, max = 500) => text(v, max) || null;
/** "1.250.000" / "1250000" → 1250000 */
const idr = (v: unknown) => Math.round(Number(String(v ?? "").replace(/[^\d-]/g, "")) || 0);
/** Angka desimal; menerima koma maupun titik sebagai pemisah desimal. */
const decimal = (v: unknown) => Number(String(v ?? "").trim().replace(/\s/g, "").replace(",", "."));

function refresh() {
  revalidatePath("/", "layout");
}

// ───────── Sesi ─────────

export async function login(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  if (!process.env.ADMIN_PASSWORD) return { error: "ADMIN_PASSWORD belum diatur di environment variable." };
  if (!checkAdminPassword(String(formData.get("password") ?? ""))) {
    await new Promise((r) => setTimeout(r, 1200)); // perlambat percobaan tebak-tebakan
    return { error: "Kata sandi salah." };
  }
  await startAdminSession();
  redirect("/admin");
}

export async function logout() {
  await endAdminSession();
  redirect("/admin/login");
}

// ───────── Pengaturan ─────────

export async function saveSettings(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const shop_name = text(formData.get("shop_name"), 60);
  if (!shop_name) return { error: "Nama jastip tidak boleh kosong." };
  const { error } = await db().from("settings").upsert({
    id: 1, shop_name,
    tagline: nullable(formData.get("tagline"), 160),
    admin_whatsapp: nullable(formData.get("admin_whatsapp"), 30),
    payment_info: nullable(formData.get("payment_info"), 1000),
    updated_at: new Date().toISOString(),
  });
  if (error) return { error: `Gagal menyimpan: ${error.message}` };
  refresh();
  return { ok: "Pengaturan disimpan." };
}

// ───────── Trip ─────────

export async function saveTrip(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const id = text(formData.get("id"), 40);
  const name = text(formData.get("name"), 120);
  const currency = text(formData.get("currency"), 5).toUpperCase();
  const rate = decimal(formData.get("rate"));
  const fee_type = formData.get("fee_type") === "flat" ? "flat" : "persen";
  const fee_value = decimal(formData.get("fee_value") || "0");
  const status = text(formData.get("status"), 10) || "buka";

  if (!name) return { error: "Isi nama trip." };
  if (!/^[A-Z]{3}$/.test(currency)) return { error: "Pilih mata uang." };
  if (!Number.isFinite(rate) || rate <= 0) return { error: "Isi kurs dengan angka lebih dari 0." };
  if (!Number.isFinite(fee_value) || fee_value < 0) return { error: "Fee belum benar." };
  if (fee_type === "persen" && fee_value > 100) return { error: "Fee persen maksimal 100." };
  if (!["draf", "buka", "tutup", "selesai"].includes(status)) return { error: "Status tidak dikenal." };

  const row = {
    name, currency, rate, fee_type, fee_value, status,
    destination: nullable(formData.get("destination"), 120),
    close_date: nullable(formData.get("close_date"), 10),
    arrival_date: nullable(formData.get("arrival_date"), 10),
    note: nullable(formData.get("note"), 1000),
  };

  const supabase = db();
  if (!id) {
    const { data, error } = await supabase.from("trips").insert(row).select("id").single();
    if (error || !data) return { error: `Gagal menyimpan trip: ${error?.message}` };
    refresh();
    redirect(`/admin/trip/${data.id}`);
  }

  const { error } = await supabase.from("trips").update(row).eq("id", id);
  if (error) return { error: `Gagal menyimpan trip: ${error.message}` };

  let applied = "";
  if (formData.get("apply_rate") === "on") {
    // Terapkan kurs & fee baru ke pesanan yang belum dikonfirmasi (harga belum final).
    const { data, error: e2 } = await supabase
      .from("orders").update({ rate, fee_type, fee_value }).eq("trip_id", id).eq("status", "baru").select("id");
    if (e2) return { error: `Trip tersimpan, tapi kurs pesanan gagal diperbarui: ${e2.message}` };
    applied = ` Kurs & fee diterapkan ke ${data?.length ?? 0} pesanan yang belum dikonfirmasi.`;
  }
  refresh();
  return { ok: `Trip disimpan.${applied}` };
}

export async function deleteTrip(formData: FormData) {
  await requireAdmin();
  const id = text(formData.get("id"), 40);
  const { error } = await db().from("trips").delete().eq("id", id);
  if (error) redirect(`/admin/trip/${id}?gagal=hapus`); // masih punya pesanan (FK restrict)
  refresh();
  redirect("/admin/trip");
}

// ───────── Pesanan ─────────

export async function saveOrder(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const id = text(formData.get("id"), 40);
  const status = text(formData.get("status"), 20);
  if (!["baru", "dikonfirmasi", "dibeli", "dikirim", "selesai", "batal"].includes(status)) {
    return { error: "Status tidak dikenal." };
  }
  const rate = decimal(formData.get("rate"));
  const fee_type = formData.get("fee_type") === "flat" ? "flat" : "persen";
  const fee_value = decimal(formData.get("fee_value") || "0");
  if (!Number.isFinite(rate) || rate <= 0) return { error: "Kurs harus lebih dari 0." };
  if (!Number.isFinite(fee_value) || fee_value < 0) return { error: "Fee belum benar." };
  const shipping = idr(formData.get("shipping"));
  if (shipping < 0) return { error: "Ongkir tidak boleh negatif." };

  const supabase = db();
  const { error } = await supabase.from("orders").update({
    status, rate, fee_type, fee_value, shipping,
    other_cost: idr(formData.get("other_cost")),
    tracking_number: nullable(formData.get("tracking_number"), 80),
    admin_note: nullable(formData.get("admin_note"), 1000),
  }).eq("id", id);
  if (error) return { error: `Gagal menyimpan pesanan: ${error.message}` };

  // Baris barang: item_<id>_price / _qty / _status
  const itemIds = formData.getAll("item_id").map((v) => text(v, 40));
  for (const itemId of itemIds) {
    const rawPrice = String(formData.get(`item_${itemId}_price`) ?? "").trim();
    const price = rawPrice === "" ? null : decimal(rawPrice);
    const qty = Math.floor(Number(formData.get(`item_${itemId}_qty`)));
    const itemStatus = text(formData.get(`item_${itemId}_status`), 20);
    if (price !== null && (!Number.isFinite(price) || price < 0)) return { error: "Ada harga barang yang belum benar." };
    if (!Number.isFinite(qty) || qty < 1) return { error: "Jumlah barang minimal 1." };
    if (!["menunggu", "dibeli", "kosong"].includes(itemStatus)) return { error: "Status barang tidak dikenal." };
    const { error: e } = await supabase
      .from("order_items").update({ price, qty, status: itemStatus }).eq("id", itemId).eq("order_id", id);
    if (e) return { error: `Gagal menyimpan barang: ${e.message}` };
  }

  refresh();
  return { ok: "Perubahan disimpan." };
}

export async function deleteOrder(formData: FormData) {
  await requireAdmin();
  const id = text(formData.get("id"), 40);
  await db().from("orders").delete().eq("id", id);
  refresh();
  redirect("/admin/pesanan");
}

/** Tombol cepat di daftar belanja trip. */
export async function setItemStatus(formData: FormData) {
  await requireAdmin();
  const id = text(formData.get("id"), 40);
  const status = text(formData.get("status"), 20);
  if (!["menunggu", "dibeli", "kosong"].includes(status)) return;
  await db().from("order_items").update({ status }).eq("id", id);
  refresh();
}

// ───────── Pembayaran ─────────

export async function reviewPayment(formData: FormData) {
  await requireAdmin();
  const id = text(formData.get("id"), 40);
  const decision = formData.get("decision") === "diterima" ? "diterima" : "ditolak";
  const update: Record<string, unknown> = { status: decision };
  const amount = idr(formData.get("amount"));
  if (decision === "diterima" && amount > 0) update.amount = amount; // admin bisa mengoreksi nominal
  await db().from("payments").update(update).eq("id", id);
  refresh();
}

export async function deletePayment(formData: FormData) {
  await requireAdmin();
  await db().from("payments").delete().eq("id", text(formData.get("id"), 40));
  refresh();
}

/** Catat pembayaran yang diterima di luar aplikasi (tunai, transfer langsung). */
export async function addPayment(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const amount = idr(formData.get("amount"));
  if (amount <= 0) return { error: "Isi jumlah pembayaran." };
  const { error } = await db().from("payments").insert({
    order_id: text(formData.get("order_id"), 40), amount, status: "diterima",
    note: nullable(formData.get("note"), 300) ?? "Dicatat admin",
  });
  if (error) return { error: `Gagal mencatat pembayaran: ${error.message}` };
  refresh();
  return { ok: "Pembayaran dicatat." };
}
