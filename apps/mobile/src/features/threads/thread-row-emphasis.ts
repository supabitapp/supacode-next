import type { ThreadListV2Status } from "./threadListV2";

export function shouldRecedeThreadRow(input: {
  readonly status: ThreadListV2Status;
  readonly selected: boolean;
  readonly pinned: boolean;
}): boolean {
  return (
    !input.selected && !input.pinned && (input.status === "working" || input.status === "waiting")
  );
}
