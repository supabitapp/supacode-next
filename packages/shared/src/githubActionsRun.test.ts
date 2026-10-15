import { describe, expect, it } from "vite-plus/test";

import { githubActionsRunFromCommand } from "./githubActionsRun.ts";

describe("githubActionsRunFromCommand", () => {
  it("reads the run a gh run watch follows", () => {
    expect(githubActionsRunFromCommand("gh run watch 38706617767 --exit-status")).toEqual({
      runId: 38706617767,
    });
    expect(
      githubActionsRunFromCommand("timeout 7200 gh run watch --interval 60 38706617767 --compact"),
    ).toEqual({ runId: 38706617767 });
  });

  it("keeps the repository and host a gh flag names", () => {
    expect(githubActionsRunFromCommand("gh run watch 42 -R acme/web")).toEqual({
      runId: 42,
      repository: "acme/web",
    });
    expect(githubActionsRunFromCommand("gh run view --repo=ghe.acme.dev/acme/web 42")).toEqual({
      runId: 42,
      repository: "acme/web",
      host: "ghe.acme.dev",
    });
  });

  it("reads a polling loop over gh run view", () => {
    expect(
      githubActionsRunFromCommand(
        "for i in $(seq 120); do gh run view 42 --json status -q .status | grep -q completed && break; sleep 60; done",
      ),
    ).toEqual({ runId: 42 });
  });

  it("reads run URLs and API paths", () => {
    expect(
      githubActionsRunFromCommand("open https://github.com/acme/web/actions/runs/42/job/7"),
    ).toEqual({ runId: 42, repository: "acme/web", host: "github.com" });
    expect(githubActionsRunFromCommand("gh api repos/acme/web/actions/runs/42/jobs")).toEqual({
      runId: 42,
      repository: "acme/web",
    });
  });

  it("prefers the mention that names the repository", () => {
    expect(
      githubActionsRunFromCommand(
        "gh run watch 42 && echo https://github.com/acme/web/actions/runs/42",
      ),
    ).toEqual({ runId: 42, repository: "acme/web", host: "github.com" });
  });

  it("reads the run inside a Codex shell wrapper", () => {
    expect(githubActionsRunFromCommand("/bin/zsh -lc 'gh run watch 42'")).toEqual({ runId: 42 });
    expect(githubActionsRunFromCommand(`bash -lc "gh run watch 42 -R 'acme/web'"`)).toEqual({
      runId: 42,
      repository: "acme/web",
    });
  });

  it("does not read a substitution's numbers as the run id", () => {
    expect(
      githubActionsRunFromCommand(
        "gh run watch $(gh run list --branch main --limit 1 --json databaseId --jq '.[0].databaseId') --exit-status",
      ),
    ).toBeNull();
    expect(
      githubActionsRunFromCommand("gh run watch `gh run list -L 1 --json databaseId`"),
    ).toBeNull();
    expect(githubActionsRunFromCommand("gh run watch 0x1F")).toBeNull();
  });

  it("only believes run URLs on GitHub hosts", () => {
    expect(
      githubActionsRunFromCommand("open https://codeberg.org/acme/web/actions/runs/42"),
    ).toBeNull();
    expect(
      githubActionsRunFromCommand("open https://github.acme.dev/acme/web/actions/runs/42"),
    ).toEqual({ runId: 42, repository: "acme/web", host: "github.acme.dev" });
  });

  it("names no run when there is none, or more than one", () => {
    expect(githubActionsRunFromCommand("vp run dev")).toBeNull();
    expect(githubActionsRunFromCommand('gh run watch "$RUN_ID"')).toBeNull();
    expect(githubActionsRunFromCommand("gh run list --limit 5")).toBeNull();
    expect(githubActionsRunFromCommand("gh run watch 1; gh run watch 2")).toBeNull();
  });
});
