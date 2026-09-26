"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode }),
      });
      if (res.ok) {
        router.replace("/");
        router.refresh();
        return;
      }
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Something went wrong at the front desk.");
    } catch {
      setError("Couldn't reach the front desk. Check your connection.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rotate-[-0.5deg] bg-card p-6 shadow-[4px_6px_0_var(--line)] border border-line"
        aria-describedby={error ? "login-error" : undefined}
      >
        <p className="stamp text-xs mb-3">Authorized personnel only</p>
        <h1 className="font-heading text-3xl font-bold uppercase tracking-wide leading-none">
          Help Wanted
        </h1>
        <p className="text-sm text-ink-soft mt-1 mb-5">
          Village Public Works Department. Writers&apos; room. Employee ID required.
        </p>

        <label htmlFor="passcode" className="block font-heading uppercase text-sm tracking-wider mb-1">
          Employee ID
        </label>
        <input
          id="passcode"
          name="passcode"
          type="password"
          autoComplete="current-password"
          autoFocus
          required
          maxLength={200}
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          className="w-full bg-paper border border-line px-3 py-2 text-base"
        />

        {error && (
          <p id="login-error" role="alert" className="mt-3 text-sm text-stamp">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy || passcode.length === 0}
          className="mt-5 w-full bg-note text-note-ink font-heading uppercase tracking-wider font-bold py-2.5 border border-line shadow-[2px_3px_0_var(--line)] active:translate-y-px disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {busy ? "Checking the badge…" : "Clock in"}
        </button>

        <p className="mt-4 text-xs text-ink-soft">Budget: 0 emeralds. Deadline: yesterday.</p>
      </form>
    </main>
  );
}
