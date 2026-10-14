import { useCallback, useState } from "react";
import type { ThreadContentPresentation } from "./threadContentPresentation";

/**
 * Keeps the loading handoff open until the incoming list has positioned its messages. The feed
 * mounts once per thread, so every open waits for the list, including cached conversations.
 */
export function useThreadFeedLoading(input: {
  readonly threadKey: string;
  readonly listMountKey: string;
  readonly contentKind: ThreadContentPresentation["kind"];
  readonly hasContent: boolean;
  readonly hasPendingMessages: boolean;
}) {
  const [loadedListKey, setLoadedListKey] = useState<string | null>(null);
  const [openingThreadKey, setOpeningThreadKey] = useState<string | null>(input.threadKey);
  const fetchingMessages = input.contentKind === "loading" && !input.hasPendingMessages;
  if (fetchingMessages && openingThreadKey !== input.threadKey) {
    setOpeningThreadKey(input.threadKey);
    setLoadedListKey(null);
  }
  const loading =
    fetchingMessages ||
    (openingThreadKey === input.threadKey &&
      input.contentKind === "ready" &&
      !input.hasPendingMessages &&
      input.hasContent &&
      loadedListKey !== input.listMountKey);

  if (!loading && openingThreadKey !== null) setOpeningThreadKey(null);

  const onListLoaded = useCallback(() => {
    setLoadedListKey(input.listMountKey);
  }, [input.listMountKey]);

  return { loading, onListLoaded };
}
