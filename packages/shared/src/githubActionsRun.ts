import type { OrchestrationV2GitHubActionsRun } from "@supaterm/contracts";

import { tokenizeCliArgs } from "./cliArgs.ts";

const RUN_URL = /\bhttps?:\/\/([\w.-]+)\/([\w.-]+\/[\w.-]+)\/actions\/runs\/(\d+)/giu;
const RUN_API_PATH = /(?:^|[\s"'/])repos\/([\w.-]+\/[\w.-]+)\/actions\/runs\/(\d+)/giu;
// Arguments end where the shell takes over: a separator, or a substitution such as
// `gh run watch $(gh run list --limit 1 …)`, whose own numbers are not the run's id.
const GH_RUN = /\bgh\s+run\s+(?:watch|view)\b([^;&|\n$`()]*)/gu;
const GH_RUN_VALUE_FLAGS = new Set([
  "-R",
  "--repo",
  "-i",
  "--interval",
  "-j",
  "--job",
  "-a",
  "--attempt",
  "-q",
  "--jq",
  "-t",
  "--template",
  "--json",
]);
const REPOSITORY_SELECTOR = /^(?:([\w.-]+)\/)?([\w.-]+\/[\w.-]+)$/u;
const SHELL = /^(?:.*\/)?(?:ba|z|da|k)?sh$/u;

function isGitHubHost(host: string): boolean {
  return host.split(".").includes("github") || host.endsWith(".ghe.com");
}

/** The script of a `bash -lc '…'` wrapper, which is how Codex runs every command. */
function unwrapShell(command: string): string {
  const [program, flag, script, ...rest] = tokenizeCliArgs(command);
  return program !== undefined &&
    SHELL.test(program) &&
    flag !== undefined &&
    /^-[a-z]*c[a-z]*$/u.test(flag) &&
    script !== undefined &&
    rest.length === 0
    ? script
    : command;
}

function runId(value: string): number | null {
  if (!/^\d+$/u.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function ghRunReference(args: string): OrchestrationV2GitHubActionsRun | null {
  const tokens = tokenizeCliArgs(args);
  let repository: Omit<OrchestrationV2GitHubActionsRun, "runId"> = {};
  let id: number | null = null;
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]!;
    if (token.startsWith("-")) {
      const [flag = token, inline] = token.split(/=(.*)/su);
      let value = inline;
      if (value === undefined && GH_RUN_VALUE_FLAGS.has(flag)) {
        index += 1;
        value = tokens[index];
      }
      const selector =
        flag === "-R" || flag === "--repo" ? REPOSITORY_SELECTOR.exec(value ?? "") : null;
      if (selector !== null) {
        repository = {
          repository: selector[2]!,
          ...(selector[1] === undefined ? {} : { host: selector[1].toLowerCase() }),
        };
      }
      continue;
    }
    id ??= runId(token);
  }
  return id === null ? null : { runId: id, ...repository };
}

/**
 * The one GitHub Actions run a command follows, through `gh run watch|view <id>`, a run URL, or
 * an API path. Null when it names none, or more than one: a guess at which run matters is worse
 * than showing no run at all.
 */
export function githubActionsRunFromCommand(
  command: string,
): OrchestrationV2GitHubActionsRun | null {
  const script = unwrapShell(command);
  const found: Array<OrchestrationV2GitHubActionsRun> = [];
  for (const match of script.matchAll(RUN_URL)) {
    const host = match[1]!.toLowerCase();
    const id = runId(match[3]!);
    if (id !== null && isGitHubHost(host)) found.push({ runId: id, repository: match[2]!, host });
  }
  for (const match of script.matchAll(RUN_API_PATH)) {
    const id = runId(match[2]!);
    if (id !== null) found.push({ runId: id, repository: match[1]! });
  }
  for (const match of script.matchAll(GH_RUN)) {
    const reference = ghRunReference(match[1]!);
    if (reference !== null) found.push(reference);
  }
  const [first] = found;
  if (first === undefined || found.some((reference) => reference.runId !== first.runId)) {
    return null;
  }
  // The most specific mention wins: a URL names its host, `-R` may name only the repository.
  return (
    found.find((reference) => reference.host !== undefined) ??
    found.find((reference) => reference.repository !== undefined) ??
    first
  );
}
