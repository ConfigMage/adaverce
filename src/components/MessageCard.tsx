"use client";

import { useState } from "react";
import { getMode } from "@/lib/modes";
import type { ChatMessage } from "@/lib/storage";

type Props = {
  message: ChatMessage;
  streaming: boolean;
  onSave: (message: ChatMessage) => void;
  saved: boolean;
};

export function useCopy() {
  const [copied, setCopied] = useState(false);
  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked. The text is still selectable.
    }
  }
  return { copied, copy };
}

export function MessageCard({ message, streaming, onSave, saved }: Props) {
  const { copied, copy } = useCopy();
  const modeLabel = getMode(message.mode)?.label ?? "Chat";
  const sessionLabel = message.session ? `Session ${message.session}` : "No session";

  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[92%] sm:max-w-[75%] bg-note text-note-ink px-4 py-3 rotate-[0.6deg] shadow-[3px_4px_0_var(--line)]">
          <p className="font-heading uppercase text-[11px] tracking-widest opacity-70 mb-1">
            Sticky note · {modeLabel} · {sessionLabel}
          </p>
          <p className="memo-body text-[15px]">{message.content}</p>
        </div>
      </div>
    );
  }

  return (
    <article
      className={`bg-card border border-line shadow-[4px_5px_0_var(--line)] max-w-full ${
        message.error ? "border-stamp" : ""
      }`}
      aria-live={streaming ? "polite" : undefined}
      aria-busy={streaming || undefined}
    >
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-dashed border-line px-4 py-2">
        <span className="font-heading font-bold uppercase tracking-widest text-sm">
          {message.error ? "Incident report" : "Interoffice memo"}
        </span>
        <span className="text-xs text-ink-soft">From: Writers&apos; Room</span>
        <span className="text-xs text-ink-soft">Re: {modeLabel}</span>
        <span className="text-xs text-ink-soft">{sessionLabel}</span>
        {message.error && <span className="stamp text-[10px] ml-auto">Returned</span>}
      </header>
      <div className="px-4 py-3">
        <p className={`memo-body text-[15px] ${message.error ? "text-stamp" : ""}`}>
          {message.content}
          {streaming && <span className="inline-block w-2 h-4 align-middle bg-ink ml-0.5 animate-pulse" aria-hidden />}
          {streaming && message.content.length === 0 && (
            <span className="text-ink-soft">Typing up the memo…</span>
          )}
        </p>
      </div>
      {!streaming && !message.error && message.content.length > 0 && (
        <footer className="flex gap-2 px-4 pb-3">
          <button
            type="button"
            onClick={() => copy(message.content)}
            className="text-xs font-heading uppercase tracking-wider border border-line px-2.5 py-1 bg-paper hover:bg-note hover:text-note-ink"
          >
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            type="button"
            onClick={() => onSave(message)}
            disabled={saved}
            className="text-xs font-heading uppercase tracking-wider border border-line px-2.5 py-1 bg-paper hover:bg-note hover:text-note-ink disabled:opacity-60 disabled:hover:bg-paper disabled:hover:text-ink"
          >
            {saved ? "Saved" : "Save idea"}
          </button>
        </footer>
      )}
    </article>
  );
}
