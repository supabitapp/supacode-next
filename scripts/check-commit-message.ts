import * as NodeChildProcess from "node:child_process";
import * as NodeFS from "node:fs";

const messagePath = process.argv[2];
if (!messagePath) {
  console.error("Usage: node scripts/check-commit-message.ts <commit-message-file>");
  process.exit(1);
}

const message = NodeChildProcess.execFileSync("git", ["stripspace", "--strip-comments"], {
  input: NodeFS.readFileSync(messagePath, "utf8"),
  encoding: "utf8",
});
const attribution =
  /<(?:noreply|claude)@anthropic\.com>|\b(?:by|with) Claude (?:Opus|Fable)\b|\b(?:via|harness:) Claude Code\b/i;

if (attribution.test(message)) {
  console.error("Remove Claude attribution from the commit message before committing.");
  process.exit(1);
}
