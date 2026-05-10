import { describe, it, expect } from "vitest";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkDirective from "remark-directive";
import { calloutsRemarkPlugin } from "../src/callouts.js";

function process(source: string) {
  const tree = unified().use(remarkParse).use(remarkDirective).parse(source);
  unified().use(calloutsRemarkPlugin).runSync(tree);
  return tree;
}

describe("calloutsRemarkPlugin", () => {
  it("transforms a :::tip directive into a callout div", () => {
    const tree = process(":::tip\nHello world\n:::\n");
    const node = (tree.children[0] as { data?: { hName?: string; hProperties?: { class?: string } }; children?: Array<{ data?: { hProperties?: { class?: string } }; children?: Array<{ value?: string }> }> });
    expect(node.data?.hName).toBe("div");
    expect(node.data?.hProperties?.class).toContain("mdx-nb-callout-tip");
    const title = node.children?.[0];
    expect(title?.data?.hProperties?.class).toContain("mdx-nb-callout-title");
    // Default title for :::tip is "Tip"
    expect(title?.children?.[0]?.value).toBe("Tip");
  });

  it("uses a custom label when [Custom title] is provided", () => {
    const tree = process(":::warn[Heads up]\nDanger\n:::\n");
    const node = tree.children[0] as { children?: Array<{ children?: Array<{ value?: string }> }> };
    const title = node.children?.[0];
    expect(title?.children?.[0]?.value).toBe("Heads up");
  });

  it("ignores unknown directive names", () => {
    const tree = process(":::nope\nbody\n:::\n");
    const node = (tree.children[0] as { data?: { hName?: string } });
    expect(node.data?.hName).toBeUndefined();
  });

  it("supports each variant", () => {
    for (const v of ["tip", "info", "warn", "danger", "success"]) {
      const tree = process(`:::${v}\nbody\n:::\n`);
      const node = (tree.children[0] as { data?: { hProperties?: { class?: string } } });
      expect(node.data?.hProperties?.class).toContain(`mdx-nb-callout-${v}`);
    }
  });
});
