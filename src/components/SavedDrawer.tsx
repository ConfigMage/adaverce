"use client";

import { useEffect, useRef } from "react";
import { getMode } from "@/lib/modes";
import type { SavedIdea } from "@/lib/storage";
import { useCopy } from "./MessageCard";

type Props = {
  open: boolean;
  onClose: () => void;
  ideas: SavedIdea[];
  onDelete: (id: string) => void;
};

function SavedItem({ idea, onDelete }: { idea: SavedIdea; onDelete: (id: string) => void }) {
  const { copied, copy } = useCopy();
  const modeLabel = getMode(idea.mode)?.label ?? "Chat";
  const date = new Date(idea.ts).toLocaleDateString();
  return (
    <li className="bg-card border border-line shadow-[3px_3px_0_var(--line)]">
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 px-3 py-1.5 border-b border-dashed border-line text-[11px] text-ink-soft font-heading uppercase tracking-wider">
        <span>{modeLabel}</span>
        <span>{idea.session ? `Session ${idea.session}` : "No session"}</span>
        <span>{date}</span>
      </div>
      <p className="memo-body text-sm px-3 py-2 max-h-48 overflow-y-auto">{idea.content}</p>
      <div className="flex gap-2 px-3 pb-2">
        <button
          type="button"
          onClick={() => copy(idea.content)}
          className="text-xs font-heading uppercase tracking-wider border border-line px-2 py-0.5 bg-paper hover:bg-note hover:text-note-ink"
        >
          {copied ? "Copied" : "Copy"}
        </button>
        <button
          type="button"
          onClick={() => onDelete(idea.id)}
          className="text-xs font-heading uppercase tracking-wider border border-stamp text-stamp px-2 py-0.5 bg-paper hover:bg-stamp hover:text-white"
        >
          Shred
        </button>
      </div>
    </li>
  );
}

export function SavedDrawer({ open, onClose, ideas, onDelete }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <button
        type="button"
        aria-label="Close saved ideas"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 cursor-default"
        tabIndex={-1}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="saved-title"
        className="relative h-full w-full sm:w-[420px] bg-paper border-l border-line shadow-2xl flex flex-col"
      >
        <header className="flex items-center justify-between px-4 py-3 border-b border-line">
          <h2 id="saved-title" className="font-heading font-bold uppercase tracking-widest text-lg">
            Filing cabinet
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="font-heading uppercase tracking-wider text-sm border border-line px-3 py-1 bg-card hover:bg-note hover:text-note-ink"
          >
            Close
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-4">
          {ideas.length === 0 ? (
            <p className="text-sm text-ink-soft">
              Nothing filed yet. Press &quot;Save idea&quot; on a memo and it lands here.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {ideas.map((idea) => (
                <SavedItem key={idea.id} idea={idea} onDelete={onDelete} />
              ))}
            </ul>
          )}
        </div>
        <p className="px-4 py-2 text-[11px] text-ink-soft border-t border-line">
          Stored in this browser only. Clearing site data empties the cabinet.
        </p>
      </aside>
    </div>
  );
}
