import {
  NotebookPage,
  Stdout,
  ResultJSON,
  AgentTrace,
  IpynbOutputs,
  JsonEditor,
  CodeBlock,
  Math,
  NotebookCell
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

      <section>
        <h2>Math (KaTeX)</h2>
        <p>Inline math: <Math expr="x^2 + y^2 = z^2" display={false} />.</p>
        <p>Display math:</p>
        <Math expr="\sum_{i=1}^{n} x_i = \bar{x} \cdot n" />
      </section>

      <section>
        <h2>NotebookCell composite</h2>
        <NotebookCell
          cellId="hello"
          code={"console.log('Hello from inline TypeScript');\nconsole.log('Multiple stdout lines are captured');\n\nexport default async function () {\n  return { greeting: 'hi', n: 42 };\n}"}
          language="ts"
        />
      </section>
    </NotebookPage>
  );
}
