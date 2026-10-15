import type { PendingThreadTurn } from "../../state/threadOutbox";

export type ThreadOutboxStatus =
  | "failed"
  | "editing"
  | "offline"
  | "sending"
  | "retrying"
  | "waiting";

/** The most pressing reason a thread's pending messages have not reached the server. */
export function resolveThreadOutboxStatus(input: {
  readonly entries: ReadonlyArray<Pick<PendingThreadTurn, "id" | "status" | "error">>;
  readonly connected: boolean;
  readonly editing: boolean;
  readonly isSending: (id: string) => boolean;
}): ThreadOutboxStatus {
  if (input.entries.some((entry) => entry.status === "failed")) return "failed";
  if (input.editing) return "editing";
  if (!input.connected) return "offline";
  if (input.entries.some((entry) => input.isSending(entry.id))) return "sending";
  if (input.entries.some((entry) => entry.error !== null)) return "retrying";
  return "waiting";
}
