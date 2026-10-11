import { ORDER_FLOW, ORDER_STATUS } from "@/lib/format";
import type { OrderStatus } from "@/lib/types";

/** Tahapan pesanan dari masuk sampai diterima. */
export function StatusSteps({ status }: { status: OrderStatus }) {
  if (status === "batal") {
    return <p className="rounded-xl bg-bad-wash px-4 py-3 font-bold text-bad">Pesanan ini dibatalkan.</p>;
  }
  const current = ORDER_FLOW.indexOf(status);
  return (
    <div>
      <p className="mb-2 font-extrabold text-cobalt-deep sm:hidden">
        {ORDER_STATUS[status].label} <span className="font-semibold text-muted">(tahap {current + 1} dari {ORDER_FLOW.length})</span>
      </p>
      <ol className="grid grid-cols-5 gap-1.5">
        {ORDER_FLOW.map((s, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <li key={s} aria-current={active ? "step" : undefined}>
              <div className={`h-2 rounded-full ${done || active ? "bg-cobalt" : "bg-line"}`} />
              <p className={`mt-2 text-[0.82rem] leading-tight max-sm:sr-only ${active ? "font-extrabold text-cobalt-deep" : done ? "font-semibold" : "text-muted"}`}>
                {ORDER_STATUS[s].label}
              </p>
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-[0.92rem] text-muted">{ORDER_STATUS[status].hint}</p>
    </div>
  );
}
