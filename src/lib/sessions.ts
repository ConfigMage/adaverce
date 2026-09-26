export type SessionInfo = { number: number; title: string; week: string };

export const SESSIONS: SessionInfo[] = [
  { number: 1, title: "First Day on the Job", week: "Week 1: Onboarding" },
  { number: 2, title: "Workplace Safety Violation", week: "Week 1: Onboarding" },
  { number: 3, title: "Hiring Season", week: "Week 1: Onboarding" },
  { number: 4, title: "Quarterly Deliverables", week: "Week 1: Onboarding" },
  { number: 5, title: "Business Trip", week: "Week 2: Expansion" },
  { number: 6, title: "Hostile Takeover", week: "Week 2: Expansion" },
  { number: 7, title: "Supply Chain Issues", week: "Week 2: Expansion" },
  { number: 8, title: "The Office Party", week: "Week 2: Expansion" },
  { number: 9, title: "The Beach Resort", week: "Week 3: Big Projects" },
  { number: 10, title: "Meeting Upper Management", week: "Week 3: Big Projects" },
  { number: 11, title: "Infrastructure Bill", week: "Week 3: Big Projects" },
  { number: 12, title: "The Audit", week: "Week 3: Big Projects" },
  { number: 13, title: "Hiring a Lawyer", week: "Week 4: Eviction" },
  { number: 14, title: "Serving the Papers", week: "Week 4: Eviction" },
  { number: 15, title: "Eviction Day", week: "Week 4: Eviction" },
  { number: 16, title: "Grand Reopening", week: "Week 4: Eviction" },
];

export function getSession(n: number | null): SessionInfo | null {
  if (n === null) return null;
  return SESSIONS.find((s) => s.number === n) ?? null;
}

/** Planned work order range for a session: 3 per session, continuous. */
export function workOrderRange(n: number): { from: number; to: number } {
  return { from: (n - 1) * 3 + 1, to: n * 3 };
}
