import { NotebookPage, ModelComparison } from "mdx-notebook-react";
import type { Manifest } from "mdx-notebook-core";

export default function ComparingPage({ manifest }: { manifest: Manifest }) {
  const data = manifest.cells["compare"]?.result as
    | {
        prompt: string;
        fast: { model: string; text: string; latencyMs: number; tokensOut: number };
        careful: { model: string; text: string; latencyMs: number; tokensOut: number };
      }
    | undefined;

  return (
    <NotebookPage manifest={manifest}>
      {data && (
        <ModelComparison
          left={{
            title: `${data.fast.model} — ${data.fast.latencyMs}ms, ${data.fast.tokensOut} tokens`,
            content: data.fast.text
          }}
          right={{
            title: `${data.careful.model} — ${data.careful.latencyMs}ms, ${data.careful.tokensOut} tokens`,
            content: data.careful.text
          }}
        />
      )}
    </NotebookPage>
  );
}
