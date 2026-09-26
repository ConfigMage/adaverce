import { cookies } from "next/headers";
import { AUTH_COOKIE, verifyToken } from "./auth";

/** Server-side check used inside route handlers, in addition to the proxy. */
export async function isAuthenticated(): Promise<boolean> {
  const store = await cookies();
  return verifyToken(store.get(AUTH_COOKIE)?.value);
}

export function unauthorized(): Response {
  return Response.json({ error: "Employee ID required." }, { status: 401 });
}
