"use client";

import dynamic from "next/dynamic";

// Client-only: the assistant reads localStorage during its first render.
const Assistant = dynamic(() => import("./Assistant").then((m) => m.Assistant), {
  ssr: false,
  loading: () => (
    <div className="flex flex-1 items-center justify-center p-8 text-sm text-ink-soft" role="status">
      Opening the office…
    </div>
  ),
});

export function AssistantLoader() {
  return <Assistant />;
}
