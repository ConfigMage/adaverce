"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { getMode, MODES, type ModeId } from "@/lib/modes";
import { SESSIONS } from "@/lib/sessions";
import {
  KEYS,
  MAX_STORED_MESSAGES,
  newId,
  readJSON,
  writeJSON,
  type ChatMessage,
  type SavedIdea,
} from "@/lib/storage";
import { MessageCard } from "./MessageCard";
import { SavedDrawer } from "./SavedDrawer";

const MAX_HISTORY = 20;
const MAX_CHARS = 4000;

const WEEKS = Array.from(new Set(SESSIONS.map((s) => s.week)));

export function Assistant() {
  const router = useRouter();
  // This component is loaded client-only (see AssistantLoader), so localStorage is safe here.
  const [session, setSession] = useState<number | null>(() => {
    const stored = readJSON<number | null>(KEYS.session, null);
    return typeof stored === "number" && stored >= 1 && stored <= 16 ? stored : null;
  });
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    readJSON<ChatMessage[]>(KEYS.chat, []).filter((m) => m && typeof m.content === "string"),
  );
  const [saved, setSaved] = useState<SavedIdea[]>(() => readJSON<SavedIdea[]>(KEYS.saved, []));
  const [input, setInput] = useState("");
  const [inputMode, setInputMode] = useState<ModeId>("chat");
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    writeJSON(KEYS.session, session);
  }, [session]);

  useEffect(() => {
    writeJSON(KEYS.chat, messages.slice(-MAX_STORED_MESSAGES));
  }, [messages]);

  useEffect(() => {
    writeJSON(KEYS.saved, saved);
  }, [saved]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  const savedContents = useMemo(() => new Set(saved.map((s) => s.content)), [saved]);
  const streaming = streamingId !== null;

  const send = useCallback(
    async (mode: ModeId, text: string) => {
      if (streaming) return;
      const content = text.trim().slice(0, MAX_CHARS);
      if (!content) return;

      const userMsg: ChatMessage = { id: newId(), role: "user", content, mode, session, ts: Date.now() };
      const assistantMsg: ChatMessage = { id: newId(), role: "assistant", content: "", mode, session, ts: Date.now() };

      const history = [...messages.filter((m) => !m.error && m.content.trim().length > 0), userMsg]
        .slice(-MAX_HISTORY)
        .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }));
      // The API needs the conversation to end with the user. Also make sure it starts with one.
      while (history.length > 0 && history[0].role !== "user") history.shift();

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setStreamingId(assistantMsg.id);
      setInput("");
      setInputMode("chat");

      const controller = new AbortController();
      abortRef.current = controller;

      const update = (patch: Partial<ChatMessage>) =>
        setMessages((prev) => prev.map((m) => (m.id === assistantMsg.id ? { ...m, ...patch } : m)));

      try {
        const res = await fetch("/api/assist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session, mode, messages: history }),
          signal: controller.signal,
        });

        if (res.status === 401) {
          router.replace("/login");
          return;
        }
        if (!res.ok || !res.body) {
          const data = (await res.json().catch(() => null)) as { error?: string } | null;
          update({ content: data?.error ?? "Something went wrong in the writers' room.", error: true });
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let text = "";
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          text += decoder.decode(value, { stream: true });
          update({ content: text });
        }
        text += decoder.decode();
        update({ content: text.trim().length ? text : "[The writers' room sent back an empty memo. Try again.]" });
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsg.id
                ? { ...m, content: m.content.length ? `${m.content}\n\n[Stopped.]` : "[Stopped before the memo started.]" }
                : m,
            ),
          );
        } else {
          update({ content: "Couldn't reach the writers' room. Check your connection and try again.", error: true });
        }
      } finally {
        abortRef.current = null;
        setStreamingId(null);
      }
    },
    [messages, session, streaming, router],
  );

  function onQuickMode(mode: ModeId) {
    const def = getMode(mode);
    if (!def) return;
    if (def.quickPrompt) {
      const extra = input.trim();
      void send(mode, extra ? `${def.quickPrompt}\n\nExtra context: ${extra}` : def.quickPrompt);
    } else {
      setInputMode(mode);
      inputRef.current?.focus();
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void send(inputMode, input);
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send(inputMode, input);
    }
  }

  function stop() {
    abortRef.current?.abort();
  }

  function clearChat() {
    if (messages.length === 0) return;
    if (!window.confirm("Shred the whole conversation? Saved ideas stay in the filing cabinet.")) return;
    stop();
    setMessages([]);
  }

  function saveIdea(m: ChatMessage) {
    if (savedContents.has(m.content)) return;
    setSaved((prev) => [{ id: newId(), content: m.content, mode: m.mode, session: m.session, ts: Date.now() }, ...prev]);
  }

  const deleteIdea = useCallback((id: string) => setSaved((prev) => prev.filter((s) => s.id !== id)), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  async function logout() {
    stop();
    try {
      await fetch("/api/logout", { method: "POST" });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  const activeInputMode = getMode(inputMode);

  return (
    <div className="flex flex-col min-h-dvh">
      <header className="sticky top-0 z-30 bg-paper/95 backdrop-blur border-b border-line">
        <div className="mx-auto max-w-3xl px-4 py-2.5 flex items-center gap-3">
          <div className="min-w-0">
            <h1 className="font-heading font-bold uppercase tracking-wide text-xl leading-none">Help Wanted</h1>
            <p className="text-[11px] text-ink-soft leading-tight">Village Public Works · Writers&apos; Room</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="font-heading uppercase tracking-wider text-xs sm:text-sm border border-line px-2.5 py-1.5 bg-card hover:bg-note hover:text-note-ink"
              aria-haspopup="dialog"
            >
              Saved{saved.length > 0 ? ` (${saved.length})` : ""}
            </button>
            <button
              type="button"
              onClick={logout}
              className="font-heading uppercase tracking-wider text-xs sm:text-sm border border-line px-2.5 py-1.5 bg-card hover:bg-stamp hover:text-white hover:border-stamp"
            >
              Clock out
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-3xl px-4 py-4 flex flex-col gap-4">
        <section aria-label="Session and quick actions" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="session" className="font-heading uppercase tracking-wider text-sm">
              On the clock for
            </label>
            <select
              id="session"
              value={session ?? ""}
              onChange={(e) => setSession(e.target.value === "" ? null : Number(e.target.value))}
              className="flex-1 min-w-[12rem] bg-card border border-line px-2 py-1.5 text-sm"
            >
              <option value="">No specific session</option>
              {WEEKS.map((week) => (
                <optgroup key={week} label={week}>
                  {SESSIONS.filter((s) => s.week === week).map((s) => (
                    <option key={s.number} value={s.number}>
                      S{s.number}: {s.title}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap gap-2" role="group" aria-label="Quick actions">
            {MODES.map((m) => {
              const active = m.id !== "chat" && !m.quickPrompt && inputMode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onQuickMode(m.id)}
                  disabled={streaming}
                  aria-pressed={!m.quickPrompt ? active : undefined}
                  className={`font-heading uppercase tracking-wider text-sm border border-line px-3 py-1.5 shadow-[2px_2px_0_var(--line)] active:translate-y-px disabled:opacity-50 disabled:cursor-not-allowed ${
                    active ? "bg-note text-note-ink" : "bg-card hover:bg-note hover:text-note-ink"
                  }`}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
        </section>

        <section aria-label="Conversation" className="flex flex-col gap-4 flex-1">
          {messages.length === 0 && (
            <div className="bg-card border border-line p-4 shadow-[4px_5px_0_var(--line)]">
              <p className="stamp text-[11px] mb-2">Job board</p>
              <p className="text-sm">
                Pick the session you&apos;re on, then hit a button. Work orders, Chaos Wheel rules, bits, and titles come
                back instantly. For &quot;Off script,&quot; type what just happened and the writers&apos; room will spin it.
              </p>
              <p className="text-xs text-ink-soft mt-2">Budget: 0 emeralds. Deadline: yesterday.</p>
            </div>
          )}
          {messages.map((m) => (
            <MessageCard
              key={m.id}
              message={m}
              streaming={m.id === streamingId}
              onSave={saveIdea}
              saved={savedContents.has(m.content)}
            />
          ))}
          <div ref={bottomRef} />
        </section>
      </main>

      <form
        onSubmit={onSubmit}
        className="sticky bottom-0 z-20 bg-paper/95 backdrop-blur border-t border-line"
        aria-label="Message the writers' room"
      >
        <div className="mx-auto max-w-3xl px-4 py-3 flex flex-col gap-2">
          {inputMode !== "chat" && activeInputMode && (
            <div className="flex items-center gap-2 text-xs">
              <span className="stamp text-[10px]">{activeInputMode.label}</span>
              <button
                type="button"
                onClick={() => setInputMode("chat")}
                className="underline text-ink-soft hover:text-ink"
              >
                cancel
              </button>
            </div>
          )}
          <div className="flex items-end gap-2">
            <label htmlFor="message" className="sr-only">
              Message
            </label>
            <textarea
              id="message"
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value.slice(0, MAX_CHARS))}
              onKeyDown={onKeyDown}
              placeholder={activeInputMode?.placeholder ?? "Ask the writers' room anything…"}
              rows={2}
              maxLength={MAX_CHARS}
              disabled={streaming}
              className="flex-1 resize-none bg-card border border-line px-3 py-2 text-[15px] disabled:opacity-60"
            />
            {streaming ? (
              <button
                type="button"
                onClick={stop}
                className="font-heading uppercase tracking-wider text-sm border border-stamp text-stamp px-4 py-2.5 bg-card hover:bg-stamp hover:text-white"
              >
                Stop
              </button>
            ) : (
              <button
                type="submit"
                disabled={input.trim().length === 0}
                className="font-heading uppercase tracking-wider text-sm font-bold border border-line px-4 py-2.5 bg-note text-note-ink shadow-[2px_3px_0_var(--line)] active:translate-y-px disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Send
              </button>
            )}
          </div>
          <div className="flex items-center justify-between text-[11px] text-ink-soft">
            <span>Enter to send, Shift+Enter for a new line.</span>
            <button
              type="button"
              onClick={clearChat}
              disabled={messages.length === 0}
              className="underline hover:text-stamp disabled:no-underline disabled:opacity-50"
            >
              Clear chat
            </button>
          </div>
        </div>
      </form>

      <SavedDrawer open={drawerOpen} onClose={closeDrawer} ideas={saved} onDelete={deleteIdea} />
    </div>
  );
}
