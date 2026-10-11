import * as NodeChildProcess from "node:child_process";
import * as NodeFS from "node:fs";

const messagePath = process.argv[2];
if (!messagePath) {
  console.error("Usage: node scripts/check-commit-message.ts <commit-message-file>");
  process.exit(1);
}

const blockedAuthor = /^claude(?:$|\s+(?:code|agent|assistant)\b|\s+.*\d|\[bot\])/i;
const runtimeCredit =
  /^(?:(?:made|written|authored|generated|created|built|developed|implemented)\s+(?:by|with)\s+)?(?:gpt(?:[- .]\d[\w.-]*(?:\s+(?:sol|astra|luna))?)?|codex|claude(?:\s+code)?|ai(?:\s+assistant)?)(?:\s+\([^)]*\))?\s+(?:via|in|through|with)\s+(?:the\s+)?claude(?:\s+code)?(?:\s+harness)?(?:\s+(?:in|through)\s+Supacode)?[.!]?$/i;
const sourceCredit =
  /^claude(?:\s+(?:code|[\w.-]+\s+\d[\w.-]*))?(?:\s+\([^)]*\))?\s+(?:via|in|through|with)\s+(?:the\s+)?\S+(?:\s+harness)?[.!]?$/i;
const coAuthor = /^co[- ]?authored[- ]by\s*:/i;
const authorship =
  /(?:^|[.;,]\s+|\band\s+)(?:generated|written|authored|made|created|built|developed|implemented|assisted|powered|reviewed|review|merged|merge)[ -]+(?:by|with)\s*:?\s*\[?claude\b/i;
const metadata = /(?:^|[.·;,]\s*|\s+)(?:model|harness|agent)\s*:\s*\[?claude\b/i;
const sessionLink =
  /https?:\/\/(?:[\w-]+\.)?claude\.ai\/(?:share\/|(?:code\/)?sessions?\/|code\/session[_-])[^\s<>]+/i;

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
      return blockedAuthor.test(identity) || /^noreply@anthropic\.com$/i.test(email);
    }

    return (
      authorship.test(context) ||
      metadata.test(text) ||
      runtimeCredit.test(context) ||
      sourceCredit.test(context) ||
      sessionLink.test(text) ||
      /^claude(?:\s+code)?\s+session(?:\s+link)?\s*:\s*https?:\/\//i.test(text)
    );
  });
});

if (rejected.length > 0) {
  console.error(
    "Commit message contains Claude attribution. Remove these lines before committing:",
  );
  for (const line of rejected) {
    console.error(`  ${line.trim()}`);
  }
  process.exit(1);
}
