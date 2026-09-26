export type ModeId = "work-orders" | "chaos-wheel" | "bits" | "off-script" | "youtube" | "chat";

export type Mode = {
  id: ModeId;
  label: string;
  /** Message sent on the user's behalf when the button is clicked. Empty means the user types. */
  quickPrompt: string;
  /** Placeholder for the input when this mode needs typed input. */
  placeholder: string;
  /** Server-side instruction appended to the system prompt. */
  instruction: string;
};

export const MODES: Mode[] = [
  {
    id: "work-orders",
    label: "Work orders",
    quickPrompt: "Give me 5 new work orders for this session.",
    placeholder: "Anything specific the Mayor wants?",
    instruction:
      "Mode: WORK ORDERS. Produce exactly 5 new work orders in the exact job board format, one per block:\n" +
      "WORK ORDER #NNN\nFrom: The Mayor\nPriority: URGENT\nTask: ...\nBudget: 0 emeralds\nDeadline: Yesterday\n" +
      "Numbers must fit the selected session's planned range (each session has 3 planned numbers; " +
      "reuse the session's numbers for the first 3 and add letter suffixes like #014-B for extras). " +
      "If no session is selected, start at #001. Tasks must be doable in vanilla survival this session and " +
      "must not skip ahead of the pacing rules. Priority can vary in wording but is always some form of urgent.",
  },
  {
    id: "chaos-wheel",
    label: "Chaos Wheel",
    quickPrompt: "Give me 6 new Chaos Wheel rules for this session.",
    placeholder: "What is she doing around the one-hour mark?",
    instruction:
      "Mode: CHAOS WHEEL. Produce exactly 6 new Chaos Wheel rules phrased as temporary HR policies, " +
      "suited to what she is doing this session. Each rule gets a name, a one-line description, and a duration " +
      "(for example 10 minutes, until the next death, until the next work order). Rules must be playable in " +
      "vanilla survival and safe enough that they don't end the stream. Avoid repeating rules listed in the plan.",
  },
  {
    id: "bits",
    label: "Bits",
    quickPrompt: "Give me 5 quick comedy bits or running-joke callbacks for this session.",
    placeholder: "Any bit you want to build on?",
    instruction:
      "Mode: BITS. Produce exactly 5 quick comedy bits or running-joke callbacks for this session. Each is 1 to 3 " +
      "sentences: what she says or does, and when to do it. Lean on the cast (the Mayor, Gerald, Officer Steve, " +
      "the Coworker, the Landlord, Upper Management) and the recurring bits. Callbacks must only reference " +
      "things that have already happened by this session.",
  },
  {
    id: "off-script",
    label: "Off script",
    quickPrompt: "",
    placeholder: "What just happened?",
    instruction:
      "Mode: OFF SCRIPT. The streamer describes something that just happened on stream that wasn't planned. " +
      "First, suggest 2 or 3 ways to spin it into the story right now (in-character lines, an HR incident " +
      "report, a new work order, a Gerald blame, etc). Then give exactly one clear way to get back on track " +
      "with this session's goals. Keep it short; she is reading this live.",
  },
  {
    id: "youtube",
    label: "YouTube",
    quickPrompt: "Give me 5 episode titles and 2 thumbnail concepts for this session.",
    placeholder: "Anything notable that happened in the episode?",
    instruction:
      "Mode: YOUTUBE. Produce exactly 5 episode titles in the format \"Help Wanted Ep. X: Title\" where X is " +
      "the session number (use X if none is selected), then exactly 2 thumbnail concepts, each described in " +
      "2 sentences (composition, text overlay of 3 words or fewer, facial expression). Titles should be " +
      "clickable but honest to the episode content.",
  },
  {
    id: "chat",
    label: "Ask anything",
    quickPrompt: "",
    placeholder: "Ask the writers' room anything…",
    instruction: "",
  },
];

export const MODE_IDS = MODES.map((m) => m.id);

export function getMode(id: string): Mode | undefined {
  return MODES.find((m) => m.id === id);
}
