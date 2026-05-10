import type { BlockContent, DefinitionContent, Node, Parent, Root } from "mdast";
import type { Directives } from "mdast-util-directive";
import type { Plugin, Transformer } from "unified";
import { visit } from "unist-util-visit";

type Children = Array<BlockContent | DefinitionContent>;

const CALLOUTS = {
  tip:     { label: "Tip" },
  info:    { label: "Info" },
  warn:    { label: "Warning" },
  danger:  { label: "Danger" },
  success: { label: "Success" }
} as const;

type CalloutVariant = keyof typeof CALLOUTS;
const VARIANTS = new Set<string>(Object.keys(CALLOUTS));

function isDirective(node: Node): node is Directives {
  return (
    node.type === "containerDirective" ||
    node.type === "leafDirective" ||
    node.type === "textDirective"
  );
}

export const calloutsRemarkPlugin: Plugin<[], Root> = () => {
  const transformer: Transformer<Root> = (tree) => {
    visit(tree, (node, index, parent: Parent | undefined) => {
      if (!isDirective(node)) return;
      if (!VARIANTS.has(node.name)) return;

      const variant = node.name as CalloutVariant;
      const config = CALLOUTS[variant];

      // Only handle container directives for v1; ignore inline/leaf forms.
      if (node.type !== "containerDirective") return;

      const titleNode = (node.children[0] as { data?: { directiveLabel?: boolean }; children?: Children } | undefined);
      let titleChildren: Children;
      let bodyChildren: Children;

      if (titleNode && titleNode.data?.directiveLabel && Array.isArray(titleNode.children)) {
        titleChildren = titleNode.children;
        bodyChildren = node.children.slice(1) as Children;
      } else {
        titleChildren = [{ type: "text", value: config.label } as never];
        bodyChildren = node.children as Children;
      }

      const data = (node.data ?? (node.data = {})) as {
        hName?: string;
        hProperties?: Record<string, unknown>;
      };
      const tagName = "div";
      data.hName = tagName;
      data.hProperties = { class: `mdx-nb-callout mdx-nb-callout-${variant}` };

      // Replace children with: <div class="mdx-nb-callout-title">title</div> + body
      const titleWrap = {
        type: "paragraph" as const,
        data: {
          hName: "div",
          hProperties: { class: "mdx-nb-callout-title" }
        },
        children: titleChildren
      };

      node.children = [titleWrap, ...bodyChildren] as never;

      // Avoid lint warnings about unused params:
      void index; void parent;
    });
  };
  return transformer;
};
