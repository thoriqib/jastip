import type { FeeType, OrderItem, Payment } from "./types";

interface Pricing {
  rate: number;
  fee_type: FeeType;
  fee_value: number;
}

/** Harga barang dalam Rupiah untuk satu baris (harga satuan × jumlah × kurs). */
export function lineGoods(price: number | null, qty: number, rate: number): number {
  if (price == null) return 0;
  return Math.round(price * qty * rate);
}

/** Fee jastip untuk satu baris: persen dari harga barang, atau flat per pcs. */
export function lineFee(price: number | null, qty: number, p: Pricing): number {
  if (p.fee_type === "flat") return Math.round(p.fee_value * qty);
  return Math.round((lineGoods(price, qty, p.rate) * p.fee_value) / 100);
}

export interface OrderTotals {
  goods: number;
  fee: number;
  shipping: number;
  otherCost: number;
  total: number;
  paid: number;
  pending: number;
  remaining: number;
  /** false kalau masih ada barang yang belum punya harga */
  priced: boolean;
  itemCount: number;
  payStatus: "belum" | "dp" | "lunas";
}

export function calcOrder(
  order: Pricing & { shipping: number; other_cost: number },
  items: Pick<OrderItem, "price" | "qty" | "status">[],
  payments: Pick<Payment, "amount" | "status">[] = [],
): OrderTotals {
  const active = items.filter((i) => i.status !== "kosong");
  let goods = 0;
  let fee = 0;
  let itemCount = 0;
  for (const i of active) {
    goods += lineGoods(i.price, i.qty, order.rate);
    fee += lineFee(i.price, i.qty, order);
    itemCount += i.qty;
  }
  const priced = active.every((i) => i.price != null);
  const shipping = Number(order.shipping) || 0;
  const otherCost = Number(order.other_cost) || 0;
  const total = goods + fee + shipping + otherCost;
  const paid = payments.filter((p) => p.status === "diterima").reduce((s, p) => s + Number(p.amount), 0);
  const pending = payments.filter((p) => p.status === "menunggu").reduce((s, p) => s + Number(p.amount), 0);
  const payStatus = paid <= 0 ? "belum" : priced && total > 0 && paid >= total ? "lunas" : "dp";
  return {
    goods, fee, shipping, otherCost, total, paid, pending,
    remaining: Math.max(total - paid, 0),
    priced, itemCount, payStatus,
  };
}
