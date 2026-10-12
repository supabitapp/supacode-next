import { readCodexAuthHandoff } from "@supacode/shared/codexAuthHandoff";
import { promptLinkAppPath } from "@supacode/shared/promptLinks";
import { providerAuthReturnUrl } from "@supacode/shared/providerAuthReturnUrl";
import * as HostProcess from "@supacode/shared/HostProcess";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import type * as Scope from "effect/Scope";
import * as ElectronApp from "../electron/ElectronApp.ts";
import { isWebLink, isWebPageFile } from "./DesktopWebLinks.ts";

export type DesktopOpenEvent =
  | { readonly type: "url"; readonly url: string }
  | { readonly type: "file"; readonly path: string }
  | { readonly type: "second-instance"; readonly argv: readonly string[] };

export class DesktopOpenEvents extends Context.Service<
  DesktopOpenEvents,
  {
    readonly subscribe: (
      listener: (event: DesktopOpenEvent) => void,
    ) => Effect.Effect<void, never, Scope.Scope>;
  }
>()("@supacode/desktop/app/DesktopOpenEvents") {}

export const make = (isDevelopment: boolean) =>
  Effect.gen(function* () {
    const app = yield* ElectronApp.ElectronApp;
    const platform = yield* HostProcess.Platform;
    const pending: DesktopOpenEvent[] = [];
    let receiver: ((event: DesktopOpenEvent) => void) | undefined;
    const receive = (event: DesktopOpenEvent) => {
      if (receiver) receiver(event);
      else pending.push(event);
    };
    const supportedUrl = (url: string) => {
      const destination = providerAuthReturnUrl(url);
      return (
        promptLinkAppPath(url) !== null ||
        readCodexAuthHandoff(url, isDevelopment) !== undefined ||
        destination?.startsWith(`${isDevelopment ? "supacode-dev" : "supacode"}://app/`) === true ||
        (platform === "darwin" && isWebLink(url))
      );
    };
    yield* app.on("open-url", (event: { preventDefault: () => void }, url: string) => {
      if (!supportedUrl(url)) return;
      event.preventDefault();
      receive({ type: "url", url });
    });
    yield* app.on("open-file", (event: { preventDefault: () => void }, path: string) => {
      if (platform !== "darwin" || !isWebPageFile(path)) return;
      event.preventDefault();
      receive({ type: "file", path });
    });
    yield* app.on("second-instance", (_event: unknown, argv: readonly string[]) => {
      receive({ type: "second-instance", argv });
    });
    return DesktopOpenEvents.of({
      subscribe: (listener) =>
        Effect.acquireRelease(
          Effect.sync(() => {
            receiver = listener;
            for (const event of pending.splice(0)) listener(event);
          }),
          () =>
            Effect.sync(() => {
              if (receiver === listener) receiver = undefined;
            }),
        ).pipe(Effect.asVoid),
    });
  });

export const layer = (isDevelopment: boolean) =>
  Layer.effect(DesktopOpenEvents, make(isDevelopment));
