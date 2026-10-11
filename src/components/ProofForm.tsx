"use client";

import { useRef, useState, useTransition } from "react";
import { submitProof, type ActionResult } from "@/actions/customer";
import { compressImage } from "@/lib/image";
import { Message } from "./forms";

export function ProofForm({ code, suggested }: { code: string; suggested: number }) {
  const [state, setState] = useState<ActionResult>({});
  const [pending, start] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      try {
        const file = fd.get("proof");
        if (file instanceof File && file.size > 0) fd.set("proof", await compressImage(file));
        const res = await submitProof(fd);
        setState(res);
        if (res.ok) formRef.current?.reset();
      } catch (err) {
        setState({ error: (err as Error).message || "Bukti gagal dikirim. Coba lagi." });
      }
    });
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-4">
      <input type="hidden" name="code" value={code} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="amount">Jumlah yang ditransfer (Rp)</label>
          <input id="amount" name="amount" inputMode="numeric" required className="field num" defaultValue={suggested > 0 ? suggested : ""} placeholder="250000" />
        </div>
        <div>
          <label className="label" htmlFor="proof">Foto bukti transfer</label>
          <input id="proof" name="proof" type="file" accept="image/*" required className="field file:mr-3 file:rounded-md file:border-0 file:bg-cobalt-wash file:px-3 file:py-1 file:font-bold file:text-cobalt-deep" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="pnote">Catatan <span className="font-normal text-muted">(opsional)</span></label>
        <input id="pnote" name="note" className="field" placeholder="Misal: DP 50%, transfer dari rekening a.n. Sari" maxLength={300} />
      </div>
      <Message state={state} />
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "Mengirim bukti…" : "Kirim bukti transfer"}
      </button>
    </form>
  );
}
