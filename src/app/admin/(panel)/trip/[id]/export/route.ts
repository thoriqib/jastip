import { calcOrder, lineFee, lineGoods } from "@/lib/calc";
import { getOrders, getTrip } from "@/lib/data";
import { ITEM_STATUS, ORDER_STATUS } from "@/lib/format";
import { isAdmin } from "@/lib/session";

/** Awali sel yang bisa dibaca Excel sebagai rumus dengan tanda petik (cegah CSV injection). */
function cell(v: unknown): string {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s) && typeof v !== "number") s = "'" + s;
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return new Response("Tidak diizinkan", { status: 401 });
  const { id } = await params;
  const trip = await getTrip(id);
  if (!trip) return new Response("Trip tidak ditemukan", { status: 404 });
  const orders = await getOrders({ trip: id });

  const head = ["Kode", "Pemesan", "WhatsApp", "Email", "Status pesanan", "Barang", "Varian", "Jumlah", `Harga satuan (${trip.currency})`, "Harga barang (Rp)", "Fee (Rp)", "Status barang", "Link", "Catatan barang", "Total pesanan (Rp)", "Sudah dibayar (Rp)", "Sisa (Rp)"];
  const lines = [head.map(cell).join(",")];
  for (const o of orders) {
    const t = calcOrder(o, o.items, o.payments);
    for (const i of o.items) {
      lines.push([
        o.code, o.name, o.whatsapp, o.email, ORDER_STATUS[o.status].label, i.name, i.variant, i.qty, i.price,
        lineGoods(i.price, i.qty, o.rate), lineFee(i.price, i.qty, o), ITEM_STATUS[i.status].label, i.link, i.note,
        t.total, t.paid, t.remaining,
      ].map(cell).join(","));
    }
  }
  const slug = trip.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "trip";
  return new Response("﻿" + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="daftar-belanja-${slug}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
