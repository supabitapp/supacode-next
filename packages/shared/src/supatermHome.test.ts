import { describe, expect, it } from "vite-plus/test";

import { resolveDefaultSupatermHome } from "./supatermHome.ts";

const join = (first: string, ...rest: string[]) => [first, ...rest].join("/");
const existing = (paths: ReadonlyArray<string>) => (path: string) => paths.includes(path);

describe("resolveDefaultSupatermHome", () => {
  it("uses ~/.supaterm on a fresh machine", () => {
    expect(resolveDefaultSupatermHome("/home/u", join, existing([]))).toBe("/home/u/.supaterm");
  });

  it("keeps using ~/.supa3 when only the pre-rename home exists", () => {
    expect(resolveDefaultSupatermHome("/home/u", join, existing(["/home/u/.supa3"]))).toBe(
      "/home/u/.supa3",
    );
  });

  it("prefers ~/.supaterm once it exists", () => {
    expect(
      resolveDefaultSupatermHome(
        "/home/u",
        join,
        existing(["/home/u/.supa3", "/home/u/.supaterm"]),
      ),
    ).toBe("/home/u/.supaterm");
  });
});
