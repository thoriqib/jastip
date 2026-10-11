import type { Tone } from "@/lib/format";

const TONES: Record<Tone, string> = {
  gray: "bg-paper text-muted",
  amber: "bg-warn-wash text-warn",
  blue: "bg-cobalt-wash text-cobalt-deep",
  green: "bg-ok-wash text-ok",
  red: "bg-bad-wash text-bad",
};

export function Badge({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.78rem] font-bold whitespace-nowrap ${TONES[tone]}`}>
      {children}
    </span>
  );
}

export function Notice({ tone = "blue", children }: { tone?: Tone; children: React.ReactNode }) {
  return <div className={`rounded-xl px-4 py-3 text-[0.92rem] ${TONES[tone]}`} role="status">{children}</div>;
}

/** Ikon tag koper — tanda pengenal aplikasi. */
export function TagMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <path d="M4 9.5 12.5 4H26a2 2 0 0 1 2 2v20a2 2 0 0 1-2 2H12.5L4 22.5z" transform="rotate(90 16 16)" fill="var(--color-tag)" stroke="var(--color-ink)" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="16" cy="9.5" r="2.2" fill="var(--color-paper)" stroke="var(--color-ink)" strokeWidth="2" />
      <path d="M11 18h10M11 22h6" stroke="var(--color-ink)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
