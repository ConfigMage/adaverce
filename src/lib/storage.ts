import type { ModeId } from "./modes";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  mode: ModeId;
  session: number | null;
  ts: number;
  error?: boolean;
};

export type SavedIdea = {
  id: string;
  content: string;
  mode: ModeId;
  session: number | null;
  ts: number;
};

export const KEYS = {
  session: "hw.session",
  chat: "hw.chat",
  saved: "hw.saved",
} as const;

export const MAX_STORED_MESSAGES = 60;

export function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJSON(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked. The app still works for this session.
  }
}

export function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
}
