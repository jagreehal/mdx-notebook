import {
  NotebookPage,
  Stdout,
  ResultJSON,
  AgentTrace,
  IpynbOutputs,
  JsonEditor,
  CodeBlock
} from "mdx-notebook-react";
import type { Manifest } from "mdx-notebook-core";

export interface PageProps {
  manifest: Manifest;
}

export function Page({ manifest }: PageProps) {
  return (
    <NotebookPage manifest={manifest}>
      <section>
        <h2>Hello cell</h2>
        <Stdout cellId="hello" />
        <ResultJSON cellId="hello" />
      </section>

      <section>
        <h2>Agent trace</h2>
        <AgentTrace cellId="trace" />
        <details>
          <summary style={{ cursor: "pointer" }}>Edit the result live</summary>
          <p>Edit JSON below and watch the result re-render.</p>
          <JsonEditor cellId="trace" />
          <ResultJSON cellId="trace" />
        </details>
      </section>

      <section>
        <h2>Jupyter notebook output</h2>
        <IpynbOutputs cellId="nb:0" />
      </section>
    </NotebookPage>
  );
}
