import { useAtomValue } from "@effect/atom-react";
import { useCallback } from "react";

import { composerDraftHasUserContent } from "./pending-new-tasks-model";
import { composerDraftsAtom, type ComposerDraft } from "./use-composer-drafts";

/**
 * Whether a thread's composer holds text or attachments the user has not sent.
 * Selects a boolean so typing in one composer only re-renders a list row when
 * its draft crosses between empty and non-empty.
 */
export function useThreadHasUnsentDraft(threadKey: string): boolean {
  const select = useCallback(
    (drafts: Readonly<Record<string, ComposerDraft>>) => {
      const draft = drafts[threadKey];
      return draft !== undefined && composerDraftHasUserContent(draft);
    },
    [threadKey],
  );
  return useAtomValue(composerDraftsAtom, select);
}
