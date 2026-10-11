import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { login } from "@/actions/admin";
import { isAdmin } from "@/lib/session";
import { ActionForm, SubmitButton } from "@/components/forms";
import { TagMark } from "@/components/ui";

export const metadata: Metadata = { title: "Masuk admin", robots: { index: false } };

export default async function LoginPage() {
  if (await isAdmin()) redirect("/admin");
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4 py-10">
      <TagMark className="h-10 w-10" />
      <h1 className="mt-4 text-[1.8rem] font-extrabold">Masuk sebagai admin</h1>
      <p className="mt-1 mb-6 text-muted">Halaman ini untuk pengelola jastip.</p>
      <ActionForm action={login} className="sheet space-y-4 p-5">
        <div>
          <label className="label" htmlFor="password">Kata sandi admin</label>
          <input id="password" name="password" type="password" required autoFocus autoComplete="current-password" className="field" />
        </div>
        <SubmitButton pendingText="Memeriksa…">Masuk</SubmitButton>
      </ActionForm>
    </main>
  );
}
