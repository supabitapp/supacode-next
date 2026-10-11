import { describe, expect, it } from "vite-plus/test";

import { shouldRecedeThreadRow } from "./thread-row-emphasis";

describe("shouldRecedeThreadRow", () => {
  it("recedes background work", () => {
    expect(shouldRecedeThreadRow({ status: "working", selected: false, pinned: false })).toBe(true);
    expect(shouldRecedeThreadRow({ status: "waiting", selected: false, pinned: false })).toBe(true);
  });

  it("keeps rows that need a human at full strength", () => {
    for (const status of ["approval", "input", "failed", "limited", "ready"] as const) {
      expect(shouldRecedeThreadRow({ status, selected: false, pinned: false })).toBe(false);
    }
  });

  it("keeps pinned rows at full strength", () => {
    expect(shouldRecedeThreadRow({ status: "working", selected: false, pinned: true })).toBe(false);
    expect(shouldRecedeThreadRow({ status: "waiting", selected: false, pinned: true })).toBe(false);
  });

  it("never fades the selected row", () => {
    expect(shouldRecedeThreadRow({ status: "working", selected: true, pinned: false })).toBe(false);
  });
});
