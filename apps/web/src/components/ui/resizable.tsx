import * as Schema from "effect/Schema";
import * as React from "react";
import {
  Group,
  Panel,
  Separator,
  usePanelRef,
  type GroupProps,
  type PanelProps,
  type PanelSize,
  type SeparatorProps,
} from "react-resizable-panels";

import {
  getLocalStorageItem,
  removeLocalStorageItem,
  setLocalStorageItem,
} from "~/hooks/useLocalStorage";
import { cn } from "~/lib/utils";

/** Last expanded width, so collapsing content keeps its width while the panel animates closed. */
const PANEL_WIDTH_PROPERTY = "--resizable-panel-width";
const PANEL_TOGGLING_ATTRIBUTE = "data-panel-toggling";
const GROUP_ANIMATING_ATTRIBUTE = "data-panels-animating";

interface ResizablePanelGroupContextValue {
  /** Runs after each layout change the user made by pointer or keyboard. */
  readonly subscribe: (listener: () => void) => () => void;
  /** False while the group mounts; its imperative API is ready only once this flips. */
  readonly mounted: React.RefObject<boolean>;
}

const ResizablePanelGroupContext = React.createContext<ResizablePanelGroupContextValue | null>(
  null,
);

function ResizablePanelGroup({ onLayoutChanged, ...props }: GroupProps) {
  const listeners = React.useRef(new Set<() => void>());
  const mounted = React.useRef(false);
  React.useLayoutEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const context = React.useMemo<ResizablePanelGroupContextValue>(
    () => ({
      subscribe: (listener) => {
        listeners.current.add(listener);
        return () => {
          listeners.current.delete(listener);
        };
      },
      mounted,
    }),
    [],
  );
  return (
    <ResizablePanelGroupContext value={context}>
      <Group
        data-slot="resizable-panel-group"
        onLayoutChanged={(layout, meta) => {
          onLayoutChanged?.(layout, meta);
          if (meta.isUserInteraction) listeners.current.forEach((listener) => listener());
        }}
        {...props}
      />
    </ResizablePanelGroupContext>
  );
}

function ResizablePanel({ style, ...props }: PanelProps) {
  return <Panel data-slot="resizable-panel" style={{ overflow: "hidden", ...style }} {...props} />;
}

/**
 * A zero-width divider. The library hit-tests its own widened target; the
 * `before` strip gives double-click a real element to land on. The library's
 * double-click resets to a percentage, so it is off and callers pass their own.
 */
function ResizableHandle({ className, ...props }: Omit<SeparatorProps, "disableDoubleClick">) {
  return (
    <Separator
      className={cn(
        "relative z-20 w-0 outline-none before:absolute before:inset-y-0 before:-left-1 before:w-2 after:pointer-events-none after:absolute after:inset-y-0 after:left-1/2 after:w-px after:-translate-x-1/2 after:transition-colors after:duration-150 data-[separator=active]:after:bg-primary/60 data-[separator=disabled]:hidden data-[separator=focus]:after:bg-ring data-[separator=hover]:after:bg-border",
        className,
      )}
      data-slot="resizable-handle"
      disableDoubleClick
      {...props}
    />
  );
}

interface ResizablePanelWidthOptions {
  /** localStorage key for the user's width; null keeps it per mount. */
  readonly storageKey: string | null;
  readonly defaultWidth: number;
  readonly minWidth: number;
  readonly maxWidth?: number | string | undefined;
  readonly open: boolean;
  /** Mount collapsed and animate open, for panels that mount when they open. */
  readonly animateMount?: boolean | undefined;
  /** The user dragged the panel below its collapse threshold. */
  readonly onCollapse?: (() => void) | undefined;
}

function readStoredWidth(storageKey: string | null, defaultWidth: number, minWidth: number) {
  if (storageKey === null || typeof window === "undefined") return defaultWidth;
  try {
    return Math.max(minWidth, getLocalStorageItem(storageKey, Schema.Finite) ?? defaultWidth);
  } catch (error) {
    console.error("Could not read persisted panel width.", error);
    return defaultWidth;
  }
}

function writeStoredWidth(storageKey: string | null, width: number | null) {
  if (storageKey === null) return;
  try {
    if (width === null) removeLocalStorageItem(storageKey);
    else setLocalStorageItem(storageKey, width, Schema.Finite);
  } catch (error) {
    console.error("Could not persist panel width.", error);
  }
}

/**
 * Pixel width, persistence, and open state for a collapsible side panel in a
 * `ResizablePanelGroup`. Spread `panelProps` on the panel and `handleProps` on
 * its handle. Width persists once per drag, not on every pointer move.
 */
function useCollapsiblePanel(options: ResizablePanelWidthOptions) {
  const { storageKey, defaultWidth, minWidth, maxWidth, open } = options;
  const panelRef = usePanelRef();
  const elementRef = React.useRef<HTMLDivElement | null>(null);
  const [stored, setStored] = React.useState(() => ({
    storageKey,
    width: readStoredWidth(storageKey, defaultWidth, minWidth),
  }));
  // Panels stay mounted across threads; restore the destination width before paint.
  if (stored.storageKey !== storageKey) {
    setStored({ storageKey, width: readStoredWidth(storageKey, defaultWidth, minWidth) });
  }
  const width = stored.width;

  const latest = React.useRef({ ...options, width });
  React.useLayoutEffect(() => {
    latest.current = { ...options, width };
  });

  const group = React.use(ResizablePanelGroupContext);
  // The library re-registers a panel whenever defaultSize changes, so it only
  // describes the mount; later changes go through the imperative API. A panel
  // mounting with its group has no API yet, so it starts at its size instead.
  const [mountOpen] = React.useState(
    () => open && !(options.animateMount && group?.mounted.current),
  );
  const applied = React.useRef({ open: mountOpen, width });
  // A panel registers with its group after its own effects, so imperative
  // calls wait a frame; until then the panel shows its mount size.
  const [ready, setReady] = React.useState(false);
  React.useEffect(() => {
    const frame = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  const endToggle = React.useRef<(() => void) | null>(null);
  React.useLayoutEffect(() => {
    const panel = panelRef.current;
    const element = elementRef.current;
    if (!ready || !panel || !element) return;
    element.style.setProperty(PANEL_WIDTH_PROPERTY, `${width}px`);
    const previous = applied.current;
    if (previous.open === open && previous.width === width) return;
    applied.current = { open, width };
    if (previous.open !== open && panel.isCollapsed() === open) {
      endToggle.current?.();
      endToggle.current = animateToggle(element);
    }
    if (open) panel.resize(width);
    else panel.collapse();
  }, [open, panelRef, ready, width]);
  React.useEffect(() => () => endToggle.current?.(), []);

  const subscribe = group?.subscribe;
  React.useEffect(() => {
    if (!subscribe) return;
    let frame = 0;
    const commit = () => {
      const panel = panelRef.current;
      const current = latest.current;
      if (!panel || !current.open) return;
      if (panel.isCollapsed()) {
        current.onCollapse?.();
        return;
      }
      const nextWidth = Math.round(panel.getSize().inPixels);
      if (nextWidth === current.width) return;
      applied.current = { open: true, width: nextWidth };
      setStored({ storageKey: current.storageKey, width: nextWidth });
      writeStoredWidth(current.storageKey, nextWidth);
    };
    // Keyboard resizes report before the panels re-render, so measure a frame later.
    const unsubscribe = subscribe(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(commit);
    });
    return () => {
      unsubscribe();
      cancelAnimationFrame(frame);
    };
  }, [panelRef, subscribe]);

  // Sizes are measured, so a toggle reports every animated frame; keep the pinned width.
  const onResize = React.useCallback((size: PanelSize) => {
    const element = elementRef.current;
    if (!element || size.inPixels === 0 || element.hasAttribute(PANEL_TOGGLING_ATTRIBUTE)) return;
    element.style.setProperty(PANEL_WIDTH_PROPERTY, `${size.inPixels}px`);
  }, []);

  const reset = React.useCallback(() => {
    const current = latest.current;
    writeStoredWidth(current.storageKey, null);
    applied.current = { open: current.open, width: current.defaultWidth };
    setStored({ storageKey: current.storageKey, width: current.defaultWidth });
    if (current.open) panelRef.current?.resize(current.defaultWidth);
  }, [panelRef]);

  return {
    panelProps: {
      panelRef,
      elementRef,
      defaultSize: mountOpen ? width : 0,
      minSize: minWidth,
      ...(maxWidth !== undefined ? { maxSize: maxWidth } : {}),
      collapsible: true,
      collapsedSize: 0,
      groupResizeBehavior: "preserve-pixel-size",
      onResize,
    } satisfies PanelProps,
    handleProps: {
      disabled: !open,
      onDoubleClick: reset,
    } satisfies SeparatorProps,
  };
}

/**
 * Animates only an explicit open or close, never drags or window resizes. Every
 * panel in the group transitions so the sizes stay consistent mid-animation.
 */
function animateToggle(panel: HTMLElement): (() => void) | null {
  const group = panel.parentElement;
  if (!group) return null;
  const end = () => {
    group.removeAttribute(GROUP_ANIMATING_ATTRIBUTE);
    panel.removeAttribute(PANEL_TOGGLING_ATTRIBUTE);
    panel.removeEventListener("transitionend", onTransitionEnd);
    panel.removeEventListener("transitioncancel", onTransitionEnd);
  };
  const onTransitionEnd = (event: TransitionEvent) => {
    if (event.target === panel) end();
  };
  group.setAttribute(GROUP_ANIMATING_ATTRIBUTE, "");
  panel.setAttribute(PANEL_TOGGLING_ATTRIBUTE, "");
  if (Number.parseFloat(getComputedStyle(panel).transitionDuration) === 0) {
    end();
    return null;
  }
  panel.addEventListener("transitionend", onTransitionEnd);
  panel.addEventListener("transitioncancel", onTransitionEnd);
  return end;
}

export { ResizableHandle, ResizablePanel, ResizablePanelGroup, useCollapsiblePanel };
