import {
  isLegacySourceControlProviderKind,
  SourceControlProviderKind,
  PullRequestUnavailableError,
  type ProjectCloneListEvent,
  type VcsStatusLocalResult,
  type VcsStatusResult,
  type VcsStatusStreamEvent,
} from "@supacode/contracts";
import * as Schema from "effect/Schema";

const isPullRequestUnavailableError = Schema.is(PullRequestUnavailableError);

function providerKindForClient(kind: SourceControlProviderKind, acceptOpenProviderKinds?: boolean) {
  return acceptOpenProviderKinds === true || isLegacySourceControlProviderKind(kind)
    ? kind
    : SourceControlProviderKind.make("unknown");
}

export function sourceControlResultForClient<
  T extends { readonly provider: SourceControlProviderKind },
>(result: T, acceptOpenProviderKinds?: boolean) {
  const provider = providerKindForClient(result.provider, acceptOpenProviderKinds);
  return provider === result.provider ? result : { ...result, provider };
}

export function pullRequestErrorForClient<E>(error: E, acceptOpenProviderKinds?: boolean) {
  if (!isPullRequestUnavailableError(error) || error.provider === undefined) return error;
  const provider = providerKindForClient(error.provider, acceptOpenProviderKinds);
  return provider === error.provider
    ? error
    : new PullRequestUnavailableError({ ...error, provider });
}

export function vcsStatusForClient<T extends VcsStatusLocalResult | VcsStatusResult>(
  result: T,
  acceptOpenProviderKinds?: boolean,
) {
  const info = result.sourceControlProvider;
  if (info === undefined) return result;
  const kind = providerKindForClient(info.kind, acceptOpenProviderKinds);
  return kind === info.kind ? result : { ...result, sourceControlProvider: { ...info, kind } };
}

export function vcsStatusEventForClient(
  event: VcsStatusStreamEvent,
  acceptOpenProviderKinds?: boolean,
) {
  return event._tag === "remoteUpdated"
    ? event
    : {
        ...event,
        local: vcsStatusForClient(event.local, acceptOpenProviderKinds),
      };
}

export function projectClonesForClient(
  clones: ProjectCloneListEvent,
  acceptOpenProviderKinds?: boolean,
) {
  return clones.map((clone) =>
    clone.repository === null
      ? clone
      : {
          ...clone,
          repository: sourceControlResultForClient(clone.repository, acceptOpenProviderKinds),
        },
  );
}
