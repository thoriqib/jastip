"use client";

import { trackByEmail } from "@/actions/customer";
import { ActionForm, SubmitButton } from "./forms";

export function TrackForm({ defaultEmail }: { defaultEmail?: string }) {
  return (
    <ActionForm action={trackByEmail} className="space-y-3">
      <div>
        <label className="label" htmlFor="track-email">Email</label>
        <input id="track-email" name="email" type="email" required autoComplete="email" className="field" placeholder="nama@gmail.com" defaultValue={defaultEmail} />
      </div>
      <SubmitButton pendingText="Mencari…">Lihat rekap titipan</SubmitButton>
    </ActionForm>
  );
}
