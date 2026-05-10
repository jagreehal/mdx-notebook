import { NotebookPage, StreamingStdout, Stdout } from "mdx-notebook-react";
import type { Manifest } from "mdx-notebook-core";

export default function StreamingPage({ manifest }: { manifest: Manifest }) {
  return (
    <NotebookPage manifest={manifest}>
      <h2>Replayed stream</h2>
      <StreamingStdout cellId="stream" speed={0.4} />

      <h2>Static rendering (for comparison)</h2>
      <Stdout cellId="stream" />
    </NotebookPage>
  );
}
