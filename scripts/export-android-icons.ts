#!/usr/bin/env node

// Renders the Android launcher, splash, and themed-icon artwork from the Icon Composer sources.
//
// Icon Composer exports already contain a rounded-square silhouette, and Android masks the
// central 72dp of a 108dp adaptive canvas, so exporting them as a foreground produces a
// double-framed icon. Instead, each variant's full-bleed artwork is fitted into the masked
// central two thirds of the background layer, with the casing colour filling the parallax
// margin, and the foreground layer stays transparent.
//
// The Android 12+ splash screen masks its icon to a circle covering the central two thirds of a
// 288dp canvas, the same proportion the launcher crops, so the splash reuses the background
// composition. The monochrome themed icon is the production artwork's lightning bolt.

import * as NodeRuntime from "@effect/platform-node/NodeRuntime";
import * as NodeServices from "@effect/platform-node/NodeServices";
import * as Console from "effect/Console";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";
import * as Schema from "effect/Schema";
import sharp from "sharp";

const ICON_VARIANTS = ["dev", "nightly", "prod"] as const;
type IconVariant = (typeof ICON_VARIANTS)[number];

// 108dp at xxxhdpi. Expo's prebuild derives every launcher density bucket from this.
const ADAPTIVE_CANVAS = 432;
// 288dp at xxxhdpi: the full Android 12+ splash canvas, so the icon needs no upscaling.
const SPLASH_CANVAS = 1152;
// Matches the fill in each variant's icon.json, so the margin continues the casing.
const CASING = { r: 231, g: 225, b: 211, alpha: 1 };
// The bolt glows inside the screen; everything else in the artwork is low-saturation casing.
const SCREEN = { left: 0.17, top: 0.13, right: 0.83, bottom: 0.75 };
// Bolt height as a fraction of the 108dp canvas, inside the 66dp safe zone.
const MARK_FRACTION = 0.42;
const OUTPUT_DIRECTORY = "apps/mobile/assets";

export class AndroidIconRenderError extends Schema.TaggedError<AndroidIconRenderError>()(
  "AndroidIconRenderError",
  { layer: Schema.String, cause: Schema.Defect() },
) {}

const transparentCanvas = (size: number) =>
  sharp({
    create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  });

const render = <A>(layer: string, run: () => Promise<A>) =>
  Effect.tryPromise({ try: run, catch: (cause) => new AndroidIconRenderError({ layer, cause }) });

const readArtwork = Effect.fn("androidIcons.readArtwork")(function* (
  repositoryRoot: string,
  variant: IconVariant,
) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  return yield* fs.readFile(
    path.join(repositoryRoot, "assets", variant, "app-icon.icon", "Assets", "artwork.png"),
  );
});

const renderBackground = (variant: IconVariant, artwork: Uint8Array, size: number) =>
  render(`${variant}-background`, async () => {
    const visible = Math.round((size * 2) / 3);
    const inset = Math.round((size - visible) / 2);
    const fitted = await sharp(artwork).resize(visible, visible).png().toBuffer();
    return sharp({ create: { width: size, height: size, channels: 4, background: CASING } })
      .composite([{ input: fitted, left: inset, top: inset }])
      .png()
      .toBuffer();
  });

const renderTransparent = (size: number) =>
  render("foreground", () => transparentCanvas(size).png().toBuffer());

const isBoltPixel = (r: number, g: number, b: number) => {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max > 150 && (max - min) / max > 0.55 && r > b && g > b;
};

const renderMark = (artwork: Uint8Array, size: number) =>
  render("monochrome", async () => {
    const { data, info } = await sharp(artwork)
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const pixels = info.width * info.height;
    const mask = Buffer.alloc(pixels);
    for (let y = Math.floor(SCREEN.top * info.height); y < SCREEN.bottom * info.height; y += 1) {
      for (let x = Math.floor(SCREEN.left * info.width); x < SCREEN.right * info.width; x += 1) {
        const source = (y * info.width + x) * 3;
        if (isBoltPixel(data[source]!, data[source + 1]!, data[source + 2]!)) {
          mask[y * info.width + x] = 255;
        }
      }
    }
    // The bolt is drawn as a grid of lit cells; closing the gaps between them gives the themed
    // icon a solid silhouette.
    const solid = await sharp(mask, {
      raw: { width: info.width, height: info.height, channels: 1 },
    })
      .blur(6)
      .threshold(90)
      .extractChannel(0)
      .raw()
      .toBuffer();
    const white = Buffer.alloc(pixels * 4);
    for (let index = 0; index < pixels; index += 1) {
      if (solid[index]! > 0) white.fill(255, index * 4, index * 4 + 4);
    }
    const bolt = await sharp(white, {
      raw: { width: info.width, height: info.height, channels: 4 },
    })
      .trim()
      .resize({ height: Math.round(size * MARK_FRACTION) })
      .png()
      .toBuffer();
    return transparentCanvas(size)
      .composite([{ input: bolt, gravity: "center" }])
      .png()
      .toBuffer();
  });

const exportAndroidIcons = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const repositoryRoot = path.resolve(import.meta.dirname, "..");
  const write = Effect.fn("androidIcons.write")(function* (name: string, contents: Uint8Array) {
    yield* fs.writeFile(path.join(repositoryRoot, OUTPUT_DIRECTORY, name), contents);
    yield* Console.log(`wrote ${OUTPUT_DIRECTORY}/${name}`);
  });
  yield* write("android-icon-foreground.png", yield* renderTransparent(ADAPTIVE_CANVAS));
  yield* write(
    "android-icon-mark.png",
    yield* renderMark(yield* readArtwork(repositoryRoot, "prod"), ADAPTIVE_CANVAS),
  );
  for (const variant of ICON_VARIANTS) {
    const artwork = yield* readArtwork(repositoryRoot, variant);
    yield* write(
      `android-icon-background-${variant}.png`,
      yield* renderBackground(variant, artwork, ADAPTIVE_CANVAS),
    );
    yield* write(
      `android-splash-icon-${variant}.png`,
      yield* renderBackground(variant, artwork, SPLASH_CANVAS),
    );
  }
});

if (import.meta.main) {
  exportAndroidIcons.pipe(Effect.provide(NodeServices.layer), NodeRuntime.runMain);
}
