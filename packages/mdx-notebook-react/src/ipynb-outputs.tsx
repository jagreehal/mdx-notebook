import { useCellOutput, type IpynbOutput } from "mdx-notebook-core";
import { JsonView } from "./json-view.js";

export function IpynbOutputs({ cellId }: { cellId: string }) {
  const out = useCellOutput(cellId);
  const outputs = out.ipynbOutputs ?? [];
  if (outputs.length === 0) return null;
  return (
    <div className="mdx-nb">
      {outputs.map((o, i) => <IpynbOne key={i} output={o} />)}
    </div>
  );
}

function IpynbOne({ output }: { output: IpynbOutput }) {
  if (output.type === "stream") {
    const className = output.name === "stderr" ? "mdx-nb mdx-nb-stderr" : "mdx-nb";
    return <pre className={className}><code>{output.text}</code></pre>;
  }
  if (output.type === "error") {
    return (
      <div className="mdx-nb-error">
        <strong>{output.ename}</strong>: {output.evalue}
        {output.traceback.length > 0 && (
          <pre><code>{output.traceback.join("\n")}</code></pre>
        )}
      </div>
    );
  }
  // display_data | execute_result
  const data = output.data;
  if (typeof data["image/png"] === "string") {
    return <img src={`data:image/png;base64,${data["image/png"] as string}`} alt="" />;
  }
  if (typeof data["application/json"] !== "undefined") {
    return <JsonView value={data["application/json"]} />;
  }
  if (typeof data["text/plain"] === "string") {
    return <pre className="mdx-nb"><code>{data["text/plain"] as string}</code></pre>;
  }
  const mimes = Object.keys(data);
  return <div className="mdx-nb-error">Unrenderable output: {mimes.join(", ") || "<empty>"}</div>;
}
