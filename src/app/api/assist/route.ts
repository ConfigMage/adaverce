import Anthropic from "@anthropic-ai/sdk";
import { getMode, MODE_IDS, type ModeId } from "@/lib/modes";
import { getSeriesPlan } from "@/lib/series-plan";
import { isAuthenticated, unauthorized } from "@/lib/session";
import { getSession, workOrderRange } from "@/lib/sessions";

export const runtime = "nodejs";

const MAX_MESSAGES = 20;
const MAX_MESSAGE_CHARS = 4000;
const MAX_TOKENS = 1200;
const DEFAULT_MODEL = "claude-sonnet-5";

type ChatMessage = { role: "user" | "assistant"; content: string };
type AssistRequest = { session: number | null; mode: ModeId; messages: ChatMessage[] };

function bad(message: string): Response {
  return Response.json({ error: message }, { status: 400 });
}

/** Plain TypeScript validation. Returns a string error or the parsed request. */
function parseBody(body: unknown): AssistRequest | string {
  if (typeof body !== "object" || body === null || Array.isArray(body)) return "Body must be an object.";
  const b = body as Record<string, unknown>;

  let session: number | null = null;
  if (b.session !== null && b.session !== undefined) {
    if (typeof b.session !== "number" || !Number.isInteger(b.session) || b.session < 1 || b.session > 16) {
      return "session must be null or an integer from 1 to 16.";
    }
    session = b.session;
  }

  if (typeof b.mode !== "string" || !(MODE_IDS as string[]).includes(b.mode)) {
    return "mode is not one of the known modes.";
  }

  if (!Array.isArray(b.messages) || b.messages.length === 0) return "messages must be a non-empty array.";
  if (b.messages.length > MAX_MESSAGES) return `At most ${MAX_MESSAGES} messages are allowed.`;

  const messages: ChatMessage[] = [];
  for (const m of b.messages) {
    if (typeof m !== "object" || m === null) return "Each message must be an object.";
    const { role, content } = m as Record<string, unknown>;
    if (role !== "user" && role !== "assistant") return "Each message role must be user or assistant.";
    if (typeof content !== "string" || content.trim().length === 0) return "Each message needs text content.";
    if (content.length > MAX_MESSAGE_CHARS) return `Each message must be at most ${MAX_MESSAGE_CHARS} characters.`;
    messages.push({ role, content });
  }
  if (messages[messages.length - 1].role !== "user") return "The last message must be from the user.";

  return { session, mode: b.mode as ModeId, messages };
}

function buildSystem(req: AssistRequest): Anthropic.TextBlockParam[] {
  const stable =
    "You are the writers' room for the Minecraft let's play series 'Help Wanted.' " +
    "You help the streamer come up with funny, playable ideas that fit the plan below.\n\n" +
    "=== SERIES PLAN ===\n" +
    getSeriesPlan() +
    "\n=== END SERIES PLAN ===";

  const parts: string[] = [];
  const session = getSession(req.session);
  if (session) {
    const range = workOrderRange(session.number);
    parts.push(
      `Current session: Session ${session.number}, "${session.title}" (${session.week}). ` +
        `Planned work orders for this session are #${String(range.from).padStart(3, "0")} to #${String(range.to).padStart(3, "0")}. ` +
        "Keep every idea consistent with what has and hasn't happened yet: earlier sessions are done, later " +
        "sessions have not happened, and the pacing rules apply strictly (no Nether before Session 5, no End " +
        "before Session 14, no elytra until the finale, no Mending trades until Session 11).",
    );
  } else {
    parts.push(
      "No specific session is selected. Ask which session if it matters, otherwise give ideas that work " +
        "anywhere in the series and respect the pacing rules.",
    );
  }

  const mode = getMode(req.mode);
  if (mode && mode.instruction) parts.push(mode.instruction);

  parts.push(
    "Output rules: be concise. Give concrete ideas she can use on stream today. Number ideas when giving " +
      "several. Stay inside vanilla survival mechanics that actually exist in current Minecraft. Keep humor " +
      "family friendly. Do not use em dashes. Use plain text, no markdown headings or tables.",
  );

  return [
    { type: "text", text: stable, cache_control: { type: "ephemeral" } },
    { type: "text", text: parts.join("\n\n") },
  ];
}

function friendlyError(err: unknown): Response {
  if (err instanceof Anthropic.APIUserAbortError) {
    return new Response(null, { status: 499 });
  }
  if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
    console.error("assist: Anthropic rejected the API key", err.status);
    return Response.json({ error: "Anthropic rejected the API key. Check ANTHROPIC_API_KEY on the server." }, { status: 502 });
  }
  if (err instanceof Anthropic.NotFoundError) {
    console.error("assist: model not found", err.status);
    return Response.json({ error: "That model ID wasn't found. Check ANTHROPIC_MODEL on the server." }, { status: 502 });
  }
  if (err instanceof Anthropic.RateLimitError) {
    console.error("assist: rate limited", err.status);
    return Response.json({ error: "Anthropic is rate limiting us. Wait a moment and try again." }, { status: 429 });
  }
  if (err instanceof Anthropic.BadRequestError) {
    console.error("assist: bad request to Anthropic", err.status);
    return Response.json({ error: "The model rejected the request. Check ANTHROPIC_MODEL and try again." }, { status: 502 });
  }
  if (err instanceof Anthropic.APIConnectionError) {
    console.error("assist: could not reach Anthropic");
    return Response.json({ error: "Couldn't reach Anthropic. Try again in a moment." }, { status: 502 });
  }
  if (err instanceof Anthropic.APIError) {
    console.error("assist: Anthropic API error", err.status);
    return Response.json({ error: "Anthropic had a problem with that request. Try again." }, { status: 502 });
  }
  console.error("assist: unexpected error", err instanceof Error ? err.name : typeof err);
  return Response.json({ error: "Something went wrong in the writers' room. Try again." }, { status: 500 });
}

export async function POST(request: Request) {
  if (!(await isAuthenticated())) return unauthorized();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "The writers' room has no API key. Set ANTHROPIC_API_KEY on the server." }, { status: 500 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return bad("Body must be JSON.");
  }
  const parsed = parseBody(raw);
  if (typeof parsed === "string") return bad(parsed);

  const model = process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_MODEL;
  const client = new Anthropic({ apiKey, maxRetries: 1 });

  // Thinking can't be turned off on Fable, Mythos, or Opus 5.5, so keep it on but cheap there.
  const thinkingParams: Partial<Anthropic.MessageCreateParams> = /fable|mythos|opus-5-5/.test(model)
    ? { output_config: { effort: "low" } }
    : { thinking: { type: "disabled" } };

  const stream = client.messages.stream(
    {
      model,
      max_tokens: MAX_TOKENS,
      system: buildSystem(parsed),
      messages: parsed.messages,
      ...thinkingParams,
    },
    { signal: request.signal },
  );

  // Pull the first event before responding so auth and model errors get a real status code.
  const iterator = stream[Symbol.asyncIterator]();
  let first: IteratorResult<Anthropic.MessageStreamEvent>;
  try {
    first = await iterator.next();
  } catch (err) {
    return friendlyError(err);
  }

  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const push = (text: string) => controller.enqueue(encoder.encode(text));
      const handle = (event: Anthropic.MessageStreamEvent) => {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") push(event.delta.text);
      };
      try {
        if (!first.done) handle(first.value);
        for (let next = await iterator.next(); !next.done; next = await iterator.next()) handle(next.value);
        const final = await stream.finalMessage();
        if (final.stop_reason === "max_tokens") {
          push("\n\n[Cut off at the length limit. Ask for the rest.]");
        } else if (final.stop_reason === "refusal") {
          push("\n\n[The model declined that one. Try rephrasing.]");
        }
      } catch (err) {
        if (!(err instanceof Anthropic.APIUserAbortError)) {
          console.error("assist: stream error", err instanceof Error ? err.name : typeof err);
          push("\n\n[The connection to the model dropped. Try again.]");
        }
      } finally {
        controller.close();
      }
    },
    cancel() {
      stream.abort();
    },
  });

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
