export type FeeType = "persen" | "flat";
export type TripStatus = "draf" | "buka" | "tutup" | "selesai";
export type OrderStatus = "baru" | "dikonfirmasi" | "dibeli" | "dikirim" | "selesai" | "batal";
export type ItemStatus = "menunggu" | "dibeli" | "kosong";
export type PaymentStatus = "menunggu" | "diterima" | "ditolak";

export interface Settings {
  shop_name: string;
  tagline: string | null;
  admin_whatsapp: string | null;
  payment_info: string | null;
}

export interface Trip {
  id: string;
  name: string;
  destination: string | null;
  currency: string;
  rate: number;
  fee_type: FeeType;
  fee_value: number;
  status: TripStatus;
  close_date: string | null;
  arrival_date: string | null;
  note: string | null;
  created_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  position: number;
  name: string;
  link: string | null;
  variant: string | null;
  qty: number;
  price: number | null;
  status: ItemStatus;
  photo_path: string | null;
  note: string | null;
}

export interface Payment {
  id: string;
  order_id: string;
  amount: number;
  proof_path: string | null;
  status: PaymentStatus;
  note: string | null;
  created_at: string;
}

export interface Order {
  id: string;
  code: string;
  trip_id: string;
  name: string;
  email: string;
  whatsapp: string;
  address: string | null;
  note: string | null;
  status: OrderStatus;
  rate: number;
  fee_type: FeeType;
  fee_value: number;
  shipping: number;
  other_cost: number;
  tracking_number: string | null;
  admin_note: string | null;
  created_at: string;
}

export interface OrderFull extends Order {
  trip: Trip;
  items: OrderItem[];
  payments: Payment[];
}
