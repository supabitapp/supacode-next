import { describe, expect, it } from "vite-plus/test";
import { resolveThreadOutboxStatus } from "./threadOutboxStatus";

const pending = { id: "a", status: "pending", error: null } as const;
const failed = { id: "b", status: "failed", error: "Thread is archived." } as const;
const backingOff = { id: "c", status: "pending", error: "Connection lost." } as const;
const notSending = () => false;

describe("resolveThreadOutboxStatus", () => {
  it("reports a failed message before anything else", () => {
    expect(
      resolveThreadOutboxStatus({
        entries: [pending, failed],
        connected: false,
        editing: true,
        isSending: () => true,
      }),
    ).toBe("failed");
  });

  it("reports editing over a lost connection, since the edit holds delivery", () => {
    expect(
      resolveThreadOutboxStatus({
        entries: [pending],
        connected: false,
        editing: true,
        isSending: notSending,
      }),
    ).toBe("editing");
  });

  it("waits for the connection while disconnected", () => {
    expect(
      resolveThreadOutboxStatus({
        entries: [backingOff],
        connected: false,
        editing: false,
        isSending: notSending,
      }),
    ).toBe("offline");
  });

  it("reports an attempt in flight, even when an earlier attempt failed", () => {
    expect(
      resolveThreadOutboxStatus({
        entries: [backingOff],
        connected: true,
        editing: false,
        isSending: (id) => id === backingOff.id,
      }),
    ).toBe("sending");
  });

  it("reports a retry backoff when the last attempt failed transiently", () => {
    expect(
      resolveThreadOutboxStatus({
        entries: [pending, backingOff],
        connected: true,
        editing: false,
        isSending: notSending,
      }),
    ).toBe("retrying");
  });

  it("falls back to waiting for delivery to start", () => {
    expect(
      resolveThreadOutboxStatus({
        entries: [pending],
        connected: true,
        editing: false,
        isSending: notSending,
      }),
    ).toBe("waiting");
  });
});
