import { describe, expect, it } from "vite-plus/test";
import * as Schema from "effect/Schema";
import {
  ProjectCloneListEvent,
  SourceControlRepositoryInfo,
  SourceControlProviderInfo,
  SourceControlProviderKind,
  PullRequestUnavailableError,
  PullRequestOperationError,
  VcsStatusLocalResult,
  VcsStatusResult,
} from "@supacode/contracts";
import {
  projectClonesForClient,
  pullRequestErrorForClient,
  sourceControlResultForClient,
  vcsStatusEventForClient,
  vcsStatusForClient,
} from "./clientCompatibility.ts";

const legacyKind = Schema.Literals([
  "github",
  "gitlab",
  "forgejo",
  "azure-devops",
  "bitbucket",
  "unknown",
]);
const legacyInfo = Schema.Struct({ ...SourceControlProviderInfo.fields, kind: legacyKind });
const legacyStatus = Schema.Struct({
  ...VcsStatusResult.fields,
  sourceControlProvider: Schema.optional(legacyInfo),
});
const decodeLegacyStatus = Schema.decodeUnknownSync(legacyStatus);
const decodeLocal = Schema.decodeUnknownSync(VcsStatusLocalResult);
const decodeClones = Schema.decodeUnknownSync(ProjectCloneListEvent);
const status = Schema.decodeUnknownSync(VcsStatusResult)({
  isRepo: true,
  hasPrimaryRemote: true,
  isDefaultRef: false,
  refName: "main",
  hasWorkingTreeChanges: false,
  workingTree: { files: [], insertions: 0, deletions: 0 },
  hasUpstream: true,
  aheadCount: 0,
  behindCount: 0,
  pr: null,
  sourceControlProvider: { kind: "gitcafe", name: "GitCafe", baseUrl: "https://git.cafe" },
});
const repository = Schema.decodeUnknownSync(SourceControlRepositoryInfo)({
  provider: "gitcafe",
  nameWithOwner: "acme/app",
  url: "https://git.cafe/acme/app",
  sshUrl: "git@git.cafe:acme/app.git",
});

describe("older source control clients", () => {
  it("decodes refreshed status and streamed local updates with the legacy host enum", () => {
    expect(() => decodeLegacyStatus(status)).toThrow();
    expect(decodeLegacyStatus(vcsStatusForClient(status)).sourceControlProvider?.kind).toBe(
      "unknown",
    );
    const local = decodeLocal(status);
    for (const event of [
      { _tag: "snapshot" as const, local, remote: null },
      { _tag: "localUpdated" as const, local },
    ]) {
      const mapped = vcsStatusEventForClient(event);
      expect(mapped).toMatchObject({ local: { sourceControlProvider: { kind: "unknown" } } });
      expect(vcsStatusEventForClient(event, true)).toMatchObject({
        local: { sourceControlProvider: { kind: "gitcafe" } },
      });
    }
    expect(vcsStatusForClient(status, true)).toBe(status);
    expect(status.sourceControlProvider?.kind).toBe("gitcafe");
  });

  it("preserves clone progress while making its repository readable to older clients", () => {
    const clones = decodeClones([
      {
        projectId: "project:clone",
        remoteUrl: repository.sshUrl,
        destinationPath: "/tmp/app",
        repository,
        phase: "running",
        stage: "receiving",
        percent: 42,
        detail: null,
        error: null,
        startedAt: "2026-10-12T00:00:00Z",
        endedAt: null,
        sequence: 2,
      },
    ]);
    expect(projectClonesForClient(clones)).toMatchObject([
      { percent: 42, repository: { provider: "unknown" } },
    ]);
    expect(projectClonesForClient(clones, true)).toEqual(clones);
  });

  it("retains repository and review content when mapping host kinds", () => {
    const result = {
      provider: repository.provider,
      repository: "acme/app",
      body: "Review content",
    };
    expect(sourceControlResultForClient(result)).toEqual({ ...result, provider: "unknown" });
    expect(sourceControlResultForClient(result, true)).toBe(result);
    const github = { ...result, provider: SourceControlProviderKind.make("github") };
    expect(sourceControlResultForClient(github)).toBe(github);
  });

  it("maps unavailable host metadata and preserves other failures", () => {
    const error = new PullRequestUnavailableError({
      provider: repository.provider,
      reason: "provider-unsupported",
    });
    expect(pullRequestErrorForClient(error)).toMatchObject({
      _tag: error._tag,
      provider: "unknown",
      reason: error.reason,
    });
    expect(pullRequestErrorForClient(error, true)).toBe(error);
    const operation = new PullRequestOperationError({ operation: "read", detail: "Unavailable" });
    expect(pullRequestErrorForClient(operation)).toBe(operation);
  });
});
