"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { ActionResult } from "@/actions/customer";

export function SubmitButton({
  children, pendingText = "Menyimpan…", className = "btn btn-primary",
}: { children: React.ReactNode; pendingText?: string; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? pendingText : children}
    </button>
  );
}

export function Message({ state }: { state: ActionResult }) {
  if (state.error) return <p role="alert" className="rounded-lg bg-bad-wash px-3 py-2 text-[0.9rem] font-semibold text-bad">{state.error}</p>;
  if (state.ok) return <p role="status" className="rounded-lg bg-ok-wash px-3 py-2 text-[0.9rem] font-semibold text-ok">{state.ok}</p>;
  return null;
}

/** Form untuk server action berbentuk (prevState, formData) dengan pesan hasil di bawahnya. */
export function ActionForm({
  action, children, className,
}: {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  children: React.ReactNode;
  className?: string;
}) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form action={formAction} className={className}>
      {children}
      <Message state={state} />
    </form>
  );
}

/** Tombol untuk aksi yang tidak bisa dibatalkan: minta konfirmasi dulu. */
export function ConfirmButton({
  children, message, className = "btn btn-danger btn-sm",
}: { children: React.ReactNode; message: string; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit" className={className} disabled={pending}
      onClick={(e) => { if (!window.confirm(message)) e.preventDefault(); }}
    >
      {children}
    </button>
  );
}
