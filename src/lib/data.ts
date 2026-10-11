import "server-only";
import { BUCKET, db } from "./supabase";
import type { OrderFull, Payment, Settings, Trip } from "./types";

const ORDER_SELECT = "*, trip:trips(*), items:order_items(*), payments(*)";

function fail(context: string, error: { message: string } | null): void {
  if (error) throw new Error(`${context}: ${error.message}`);
}

function sortOrder(o: OrderFull): OrderFull {
  o.items.sort((a, b) => a.position - b.position);
  o.payments.sort((a, b) => a.created_at.localeCompare(b.created_at));
  return o;
}

export async function getSettings(): Promise<Settings> {
  const { data, error } = await db().from("settings").select("*").eq("id", 1).maybeSingle();
  fail("Gagal memuat pengaturan", error);
  return (
    (data as Settings | null) ?? { shop_name: "Jastip", tagline: null, admin_whatsapp: null, payment_info: null }
  );
}

export async function getTrips(): Promise<Trip[]> {
  const { data, error } = await db().from("trips").select("*").order("created_at", { ascending: false });
  fail("Gagal memuat trip", error);
  return (data ?? []) as Trip[];
}

export async function getTrip(id: string): Promise<Trip | null> {
  const { data, error } = await db().from("trips").select("*").eq("id", id).maybeSingle();
  fail("Gagal memuat trip", error);
  return data as Trip | null;
}

export async function getOrdersByEmail(email: string): Promise<OrderFull[]> {
  const { data, error } = await db()
    .from("orders").select(ORDER_SELECT).eq("email", email).order("created_at", { ascending: false });
  fail("Gagal memuat pesanan", error);
  return ((data ?? []) as OrderFull[]).map(sortOrder);
}

export async function getOrderByCode(code: string): Promise<OrderFull | null> {
  const { data, error } = await db().from("orders").select(ORDER_SELECT).eq("code", code).maybeSingle();
  fail("Gagal memuat pesanan", error);
  return data ? sortOrder(data as OrderFull) : null;
}

export async function getOrderById(id: string): Promise<OrderFull | null> {
  const { data, error } = await db().from("orders").select(ORDER_SELECT).eq("id", id).maybeSingle();
  fail("Gagal memuat pesanan", error);
  return data ? sortOrder(data as OrderFull) : null;
}

export async function getOrders(filter: { trip?: string; status?: string; q?: string } = {}): Promise<OrderFull[]> {
  let query = db().from("orders").select(ORDER_SELECT).order("created_at", { ascending: false }).limit(500);
  if (filter.trip) query = query.eq("trip_id", filter.trip);
  if (filter.status) query = query.eq("status", filter.status);
  if (filter.q) {
    // Buang karakter yang punya arti khusus di filter PostgREST.
    const q = filter.q.replace(/[,()%*\\"]/g, " ").trim();
    if (q) query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%,code.ilike.%${q}%,whatsapp.ilike.%${q}%`);
  }
  const { data, error } = await query;
  fail("Gagal memuat pesanan", error);
  return ((data ?? []) as OrderFull[]).map(sortOrder);
}

export interface PendingPayment extends Payment {
  order: { id: string; code: string; name: string; whatsapp: string };
}

export async function getPendingPayments(): Promise<PendingPayment[]> {
  const { data, error } = await db()
    .from("payments").select("*, order:orders(id, code, name, whatsapp)")
    .eq("status", "menunggu").order("created_at", { ascending: true });
  fail("Gagal memuat pembayaran", error);
  return (data ?? []) as PendingPayment[];
}

/** URL sementara (1 jam) untuk file di bucket privat. */
export async function signedUrls(paths: (string | null | undefined)[]): Promise<Record<string, string>> {
  const list = [...new Set(paths.filter((p): p is string => !!p))];
  if (list.length === 0) return {};
  const { data, error } = await db().storage.from(BUCKET).createSignedUrls(list, 3600);
  if (error || !data) return {};
  const out: Record<string, string> = {};
  for (const row of data) if (row.path && row.signedUrl) out[row.path] = row.signedUrl;
  return out;
}

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

/** Simpan gambar ke bucket. Mengembalikan path, atau melempar error dengan pesan yang bisa ditampilkan. */
export async function uploadImage(file: File, folder: string): Promise<string> {
  const ext = EXT[file.type];
  if (!ext) throw new Error("Format gambar harus JPG, PNG, atau WebP.");
  if (file.size > 5 * 1024 * 1024) throw new Error("Ukuran gambar maksimal 5 MB.");
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await db().storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error(`Gagal mengunggah gambar: ${error.message}`);
  return path;
}
