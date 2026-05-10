import { NotebookPage, NotebookCell, IpynbOutputs, AgentTrace, TutorialStatus } from "mdx-notebook-react";
import type { Manifest } from "mdx-notebook-core";

export interface TutorialPageProps {
  manifest: Manifest;
  /** Render each named cell with the appropriate component. */
  cells: string[];
}

export default function TutorialPage({ manifest, cells }: TutorialPageProps) {
  return (
    <NotebookPage manifest={manifest}>
      <TutorialStatus manifest={manifest} />
      {cells.map((id) => {
        const cell = manifest.cells[id];
        if (!cell) return <div key={id} className="mdx-nb-error">No cell with id "{id}"</div>;
        const isIpynb = (cell.ipynbOutputs?.length ?? 0) > 0;
        if (isIpynb) {
          return (
            <section key={id}>
              <h3>Notebook output: {id}</h3>
              <IpynbOutputs cellId={id} />
            </section>
          );
        }
        // Heuristic: if stdout has step markers, treat as agent trace.
        const hasSteps = cell.stdout.some((e) => /^---\s*Step/.test(e.text));
        if (hasSteps) {
          return (
            <section key={id}>
              <h3>Agent trace: {id}</h3>
              <AgentTrace cellId={id} />
            </section>
          );
        }
        return (
          <section key={id}>
            <h3>{id}</h3>
            <NotebookCell cellId={id} />
          </section>
        );
      })}
    </NotebookPage>
  );
}
