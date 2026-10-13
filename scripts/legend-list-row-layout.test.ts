// @effect-diagnostics nodeBuiltinImport:off - reads the installed web JS bundles for synchronous VM tests.
import * as NodeFS from "node:fs";
import * as NodeVM from "node:vm";
import { describe, expect, it } from "vite-plus/test";

function createList(bundle: string, firstHeight = 32) {
  const source = NodeFS.readFileSync(
    new URL(`../apps/web/node_modules/@legendapp/list/${bundle}`, import.meta.url),
    "utf8",
  );
  const positions = source.slice(
    source.indexOf("function updateItemPositions("),
    source.indexOf("// src/core/viewability.ts"),
  );
  const calculationStart = source.indexOf("function calculateItemsInView(");
  const calculation = source.slice(
    calculationStart,
    source.indexOf("    totalSize = getContentSize(ctx);", calculationStart),
  );
  const keys = Array.from({ length: 80 }, (_, index) => `row-${index}`);
  const sizes = new Map(keys.map((key, index) => [key, index === 0 ? firstHeight : 32]));
  const state = {
    props: {
      data: keys,
      alwaysRenderIndicesArr: [],
      alwaysRenderIndicesSet: new Set(),
      stickyHeaderIndicesSet: new Set(),
    },
    columns: [],
    columnSpans: [],
    idCache: keys,
    indexByKey: new Map(keys.map((key, index) => [key, index])),
    sizes,
    sizesKnown: new Map(sizes),
    positions: keys.map((_, index) => (index === 0 ? 0 : firstHeight + (index - 1) * 32)),
    scroll: 0,
    scrollLength: 600,
    lastScrollDelta: 5,
    startBuffered: 0,
    minIndexSizeChanged: undefined as number | undefined,
    scrollAdjustHandler: { getAdjust: () => 0 },
  };
  const values = new Map<string, unknown>([
    ["numContainers", 35],
    ["numColumns", 1],
    ["stylePaddingTop", 0],
    ["alignItemsAtEndPadding", 0],
    ["headerSize", 0],
    ["activeStickyIndex", -1],
  ]);
  const ctx = { state, values, positionListeners: new Map(), scrollAxisGap: 0 };
  const totalSize = () => [...sizes.values()].reduce((total, size) => total + size, 0);
  const calculate = NodeVM.runInNewContext(
    `${positions}\n${calculation}\n  });\n}\ncalculateItemsInView`,
    {
      IS_DEV: false,
      batchedUpdates: (run: () => void) => run(),
      peek$: (_ctx: unknown, key: string) => values.get(key),
      getContentSize: totalSize,
      updateTotalSize: totalSize,
      getEffectiveDrawDistance: () => 250,
      getScrollVelocity: () => 1,
      hasActiveInitialScroll: () => false,
      getId: (_state: unknown, index: number) => keys[index],
      prepareMVCP: () => undefined,
    },
  ) as (context: typeof ctx) => void;
  return {
    positions: state.positions,
    resize(index: number, height: number) {
      sizes.set(keys[index]!, height);
      state.sizesKnown.set(keys[index]!, height);
      state.minIndexSizeChanged = index;
      calculate(ctx);
    },
  };
}

describe.each(["react.js", "react.mjs", "react-native.web.js", "react-native.web.mjs"])(
  "measured row layout (%s)",
  (bundle) => {
    it("keeps later rows below a reply that grows while scrolling", () => {
      const list = createList(bundle);
      list.resize(0, 5000);
      expect(list.positions[13]).toBe(5384);
      expect(list.positions[79]).toBe(7496);
    });

    it("closes the space after a reply shrinks while scrolling", () => {
      const list = createList(bundle, 5000);
      list.resize(0, 32);
      expect(list.positions[79]).toBe(2528);
    });

    it("reconciles the suffix without moving the unaffected prefix", () => {
      const list = createList(bundle);
      const prefix = list.positions.slice(0, 20);
      list.resize(20, 5000);
      expect(list.positions.slice(0, 20)).toEqual(prefix);
      expect(list.positions[79]).toBe(7496);
    });
  },
);
