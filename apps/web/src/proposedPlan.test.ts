import { describe, expect, it } from "vite-plus/test";

import {
  buildCollapsedProposedPlanPreviewMarkdown,
  buildProposedPlanMarkdownFilename,
} from "./proposedPlan";

describe("buildCollapsedProposedPlanPreviewMarkdown", () => {
  it("drops the redundant title heading and preserves the following markdown lines", () => {
    expect(
      buildCollapsedProposedPlanPreviewMarkdown(
        "# Integrate RPC\n\n## Summary\n\n- step 1\n- step 2",
        {
          maxLines: 4,
        },
      ),
    ).toBe("- step 1\n- step 2");
  });

  it("appends an overflow marker when the preview truncates remaining content", () => {
    expect(
      buildCollapsedProposedPlanPreviewMarkdown("# Integrate RPC\n\n- step 1\n- step 2\n- step 3", {
        maxLines: 2,
      }),
    ).toBe("- step 1\n- step 2\n\n...");
  });
});

describe("buildProposedPlanMarkdownFilename", () => {
  it("derives a stable markdown filename from the plan heading", () => {
    expect(buildProposedPlanMarkdownFilename("# Integrate Effect RPC Into Server App")).toBe(
      "integrate-effect-rpc-into-server-app.md",
    );
  });

  it("falls back to a generic filename when the plan has no heading", () => {
    expect(buildProposedPlanMarkdownFilename("- step 1")).toBe("plan.md");
  });
});
