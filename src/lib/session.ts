import "server-only";
import { createHash, createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const ADMIN_COOKIE = "jastip_admin";
const EMAIL_COOKIE = "jastip_email";
const ADMIN_TTL = 60 * 60 * 24 * 7; // 7 hari
const EMAIL_TTL = 60 * 60 * 24 * 30; // 30 hari

/** Kunci tanda tangan cookie. Ganti ADMIN_PASSWORD = semua sesi lama otomatis tidak berlaku. */
function secret(): Buffer {
  const pw = process.env.ADMIN_PASSWORD ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  return createHash("sha256").update(`jastip|${pw}|${key}`).digest();
}

function sign(payload: string): string {
  const body = Buffer.from(payload, "utf8").toString("base64url");
  const mac = createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${mac}`;
}

function verify(token: string | undefined): string | null {
  if (!token) return null;
  const [body, mac] = token.split(".");
  if (!body || !mac) return null;
  const expected = createHmac("sha256", secret()).update(body).digest();
  let given: Buffer;
  try {
    given = Buffer.from(mac, "base64url");
  } catch {
    return null;
  }
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  return Buffer.from(body, "base64url").toString("utf8");
}

function read(token: string | undefined, kind: string): string | null {
  const payload = verify(token);
  if (!payload) return null;
  try {
    const data = JSON.parse(payload) as { k: string; v: string; exp: number };
    if (data.k !== kind || data.exp < Date.now()) return null;
    return data.v;
  } catch {
    return null;
  }
}

const cookieOpts = (maxAge: number) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge,
});

// ───────── Admin ─────────

export function checkAdminPassword(input: string): boolean {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return false;
  const a = createHash("sha256").update(input).digest();
  const b = createHash("sha256").update(pw).digest();
  return timingSafeEqual(a, b);
}

export async function startAdminSession() {
  const token = sign(JSON.stringify({ k: "admin", v: "1", exp: Date.now() + ADMIN_TTL * 1000 }));
  (await cookies()).set(ADMIN_COOKIE, token, cookieOpts(ADMIN_TTL));
}

export async function endAdminSession() {
  (await cookies()).delete(ADMIN_COOKIE);
}

export async function isAdmin(): Promise<boolean> {
  return read((await cookies()).get(ADMIN_COOKIE)?.value, "admin") === "1";
}

/** Dipanggil di setiap halaman dan server action admin. */
export async function requireAdmin() {
  if (!(await isAdmin())) redirect("/admin/login");
}

// ───────── Pelanggan (identitas = email, tanpa kata sandi) ─────────

export function normalizeEmail(raw: unknown): string | null {
  const e = String(raw ?? "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) && e.length <= 254 ? e : null;
}

export async function setCustomerEmail(email: string) {
  const token = sign(JSON.stringify({ k: "email", v: email, exp: Date.now() + EMAIL_TTL * 1000 }));
  (await cookies()).set(EMAIL_COOKIE, token, cookieOpts(EMAIL_TTL));
}

export async function getCustomerEmail(): Promise<string | null> {
  return read((await cookies()).get(EMAIL_COOKIE)?.value, "email");
}

export async function clearCustomerEmail() {
  (await cookies()).delete(EMAIL_COOKIE);
}
