import type {
  EnvironmentId,
  OrchestrationV2GitHubActionsRun,
  ProjectId,
  ScopedThreadRef,
} from "@supaterm/contracts";

import { cn } from "~/lib/utils";
import { pullRequestEnvironment } from "~/state/pullRequests";
import { useEnvironmentQuery } from "~/state/query";

import { PullRequestChecksPopover } from "../pullRequest/PullRequestChecksPopover";
import {
  pullRequestChecksState,
  pullRequestChecksStateRingToneClassName,
} from "../pullRequest/pullRequestPresentation";

/**
 * The background-work banner's dot. Work that will wake the agent pulses, and a watched CI run
 * colors it the way its checks ring would be, opening the same list a pull request's checks do.
 */
export function BackgroundWorkIcon({
  waiting,
  run,
  environmentId,
  projectId,
  threadRef,
}: {
  waiting: boolean;
  run: OrchestrationV2GitHubActionsRun | null;
  environmentId: EnvironmentId;
  projectId: ProjectId;
  threadRef: ScopedThreadRef | null;
}) {
  const { data: workflowRun } = useEnvironmentQuery(
    run === null
      ? null
      : pullRequestEnvironment.workflowRun({ environmentId, input: { projectId, ...run } }),
  );
  const checksState = workflowRun ? pullRequestChecksState(workflowRun.checks) : null;
  // A dev server can run for hours after the agent is done, so only work
  // that will wake the agent pulses; a finished run stops.
  const dot = (
    <span
      className={cn(
        "size-1.5 rounded-full",
        checksState === null
          ? "bg-foreground"
          : ["bg-current", pullRequestChecksStateRingToneClassName(checksState)],
        waiting &&
          (workflowRun == null || workflowRun.status === "pending") &&
          "animate-status-pulse",
      )}
      aria-hidden="true"
    />
  );
  if (!workflowRun || checksState === null) return dot;
  return (
    <PullRequestChecksPopover
      checksState={checksState}
      checks={workflowRun.checks}
      threadRef={threadRef}
      className="size-full justify-center"
    >
      {dot}
    </PullRequestChecksPopover>
  );
}
