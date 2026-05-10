import { describe, it, expect, vi } from "vitest";
import { mdxNotebookVitePlugin } from "../src/vite-plugin.js";

function mockCtx(file: string) {
  const send = vi.fn();
  const invalidateAll = vi.fn();
  return {
    ctx: { file, server: { ws: { send }, moduleGraph: { invalidateAll } } },
    send,
    invalidateAll
  };
}

describe("mdxNotebookVitePlugin", () => {
  const plugin = mdxNotebookVitePlugin() as unknown as { handleHotUpdate: (c: { file: string; server: { ws: { send: unknown }; moduleGraph: { invalidateAll: unknown } } }) => unknown };

  it("triggers full reload for .mdx changes", () => {
    const m = mockCtx("/abs/path/page.mdx");
    const result = plugin.handleHotUpdate(m.ctx);
    expect(m.send).toHaveBeenCalledWith({ type: "full-reload" });
    expect(m.invalidateAll).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it("invalidates module graph and reloads on .ipynb change", () => {
    const m = mockCtx("/abs/path/notebooks/x.ipynb");
    plugin.handleHotUpdate(m.ctx);
    expect(m.invalidateAll).toHaveBeenCalled();
    expect(m.send).toHaveBeenCalledWith({ type: "full-reload" });
  });

  it("triggers reload and invalidates module graph for .ts script changes", () => {
    const m = mockCtx("/abs/path/scripts/agent.ts");
    plugin.handleHotUpdate(m.ctx);
    expect(m.invalidateAll).toHaveBeenCalled();
    expect(m.send).toHaveBeenCalled();
  });

  it("ignores changes inside node_modules", () => {
    const m = mockCtx("/abs/path/node_modules/lib/index.ts");
    const result = plugin.handleHotUpdate(m.ctx);
    expect(m.send).not.toHaveBeenCalled();
    expect(result).toBeUndefined();
  });

  it("ignores unrelated extensions", () => {
    const m = mockCtx("/abs/path/styles.css");
    const result = plugin.handleHotUpdate(m.ctx);
    expect(m.send).not.toHaveBeenCalled();
    expect(result).toBeUndefined();
  });

  it("ignores .mdx-notebook cache writes", () => {
    const m = mockCtx("/abs/path/.mdx-notebook/abc.json");
    const result = plugin.handleHotUpdate(m.ctx);
    expect(m.send).not.toHaveBeenCalled();
    expect(result).toBeUndefined();
  });
});
