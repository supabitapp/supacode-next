import type { ScopedThreadRef } from "@supaterm/contracts";

type MarkDoneAndAdvance = (threadRef: ScopedThreadRef) => void;

// Only the mounted thread sidebar knows the card order that picks the next
// thread, so it registers its mark-done action here for other entry points.
let registeredMarkDoneAndAdvance: MarkDoneAndAdvance | null = null;

/**
 * Called by the thread sidebar while it is mounted. Returns the unregister
 * function, which leaves a newer registration in place.
 */
export function registerMarkDoneAndAdvance(handler: MarkDoneAndAdvance): () => void {
  registeredMarkDoneAndAdvance = handler;
  return () => {
    if (registeredMarkDoneAndAdvance === handler) registeredMarkDoneAndAdvance = null;
  };
}

/**
 * Marks the open thread done the way the sidebar Mark as Done button does: mark it
 * done, then move to the next thread. Used by the `thread.mark-done` shortcut.
 * Returns false when no sidebar is mounted, so the caller marks done in place.
 */
export function markDoneAndAdvance(threadRef: ScopedThreadRef): boolean {
  if (!registeredMarkDoneAndAdvance) return false;
  registeredMarkDoneAndAdvance(threadRef);
  return true;
}
