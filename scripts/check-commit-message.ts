import * as NodeChildProcess from "node:child_process";
import * as NodeFS from "node:fs";
import { PROVIDER_DISPLAY_NAMES } from "../packages/contracts/src/model.ts";

const messagePath = process.argv[2];
if (!messagePath) {
  console.error("Usage: node scripts/check-commit-message.ts <commit-message-file>");
  process.exit(1);
}

const providerNames = Object.values(PROVIDER_DISPLAY_NAMES)
  .filter((name) => name !== undefined)
  .map(RegExp.escape)
  .join("|");
const aiIdentity = new RegExp(
  `\\b(?:${providerNames}|ai|artificial intelligence|agent|assistant|bot|llm|chatgpt|gpt(?:[- .]\\d[\\w.-]*)?)\\b`,
  "i",
);
const aiAuthorName = new RegExp(
  `^(?:${aiIdentity.source})$|^(?:${providerNames})\\s+(?:code\\b|.*\\d)|\\b(?:agent|assistant|llm)$|\\[bot\\]|\\bgpt[- .]\\d`,
  "i",
);
const runtimeCredit = new RegExp(
  `^${aiIdentity.source}(?:\\s+\\([^)]*\\))?\\s+(?:via|in|through|with)\\s+(?:the\\s+)?(?:${providerNames})(?:\\s+harness)?(?:\\s+(?:in|through)\\s+Supacode)?[.!]?$`,
  "i",
);
const coAuthor = /^co[- ]?authored[- ]by\s*:/i;
const authorship = new RegExp(
  `(?:^|[.;,]\\s+|\\band\\s+)(?:(?:generated|written|authored|made|created|built|developed|implemented|assisted|powered|reviewed|review|merged|merge)[ -]+(?:by|with)\\s*:?\\s*\\[?${aiIdentity.source}|(?:ai|agent)[ -]assisted\\b)`,
  "i",
);
const metadata = /^(?:model|harness|agent)\s*:/i;
const sessionLink = /https?:\/\/[^\s<>]*(?:\/(?:sessions?|share)\/|[?&]session(?:id)?=)[^\s<>]*/i;

const message = NodeChildProcess.execFileSync("git", ["stripspace", "--strip-comments"], {
  input: NodeFS.readFileSync(messagePath, "utf8"),
  encoding: "utf8",
});
const rejected = message.split(/\n\s*\n/).flatMap((paragraph) => {
  const context = paragraph
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(?:[-*>]\s+|🤖\s*)+/, "");
  return paragraph.split(/\r?\n/).filter((line) => {
    const text = line.trim().replace(/^(?:[-*>]\s+|🤖\s*)+/, "");
    if (coAuthor.test(text)) {
      const identity = (text.replace(coAuthor, "").split("<")[0] ?? "").trim();
      const email = text.match(/<([^>]+)>/)?.[1] ?? "";
      return (
        aiAuthorName.test(identity) ||
        /\bAI$/.test(identity) ||
        (aiIdentity.test(identity) && /(?:^noreply@|\[bot\]@)/i.test(email))
      );
    }

    return (
      authorship.test(context) ||
      (metadata.test(text) && (aiIdentity.test(context) || /\bharness\s*:/i.test(context))) ||
      runtimeCredit.test(context) ||
      (sessionLink.test(text) && aiIdentity.test(text)) ||
      /^(?:agent\s+)?session(?:\s+link)?\s*:\s*https?:\/\//i.test(text)
    );
  });
});

if (rejected.length > 0) {
  console.error("Commit message contains AI attribution. Remove these lines before committing:");
  for (const line of rejected) {
    console.error(`  ${line.trim()}`);
  }
  process.exit(1);
}
