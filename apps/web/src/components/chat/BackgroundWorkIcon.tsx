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
import { pullRequestChecksState } from "../pullRequest/pullRequestPresentation";

/**
 * The background-work banner's icon. Work that follows a CI run shows the run's checks ring,
 * opening the same list a pull request's checks do; anything else, and a run with no job to
 * show yet, gets the dot.
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
  const { data: checks } = useEnvironmentQuery(
    run === null
      ? null
      : pullRequestEnvironment.workflowRunChecks({ environmentId, input: { projectId, ...run } }),
  );
  const checksState = checks ? pullRequestChecksState(checks) : null;
  if (checks && checksState !== null) {
    return (
      <PullRequestChecksPopover
        checksState={checksState}
        checks={checks}
        threadRef={threadRef}
        className="size-full justify-center"
      />
    );
  }
  // A dev server can run for hours after the agent is done, so only work
  // that will wake the agent pulses.
  return (
    <span
      className={cn("size-1.5 rounded-full bg-foreground", waiting && "animate-status-pulse")}
      aria-hidden="true"
    />
  );
}
