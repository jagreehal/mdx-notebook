import { describe, it, expect, vi } from "vitest";
import mdxNotebook from "../src/index.js";

describe("default integration export", () => {
  it("returns an Astro integration object with a name and the config:setup hook", () => {
    const integration = mdxNotebook();
    expect(integration.name).toBe("mdx-notebook-astro");
    expect(typeof integration.hooks["astro:config:setup"]).toBe("function");
  });
});

describe("mdxNotebook integration options", () => {
  it("with no options: only registers the Vite HMR plugin", async () => {
    const integration = mdxNotebook();
    const updateConfig = vi.fn();
    const addIntegration = vi.fn();
    await (integration.hooks["astro:config:setup"] as (c: unknown) => Promise<void>)({
      updateConfig, addIntegration, config: {}
    });
    expect(updateConfig).toHaveBeenCalledTimes(1);
    expect(addIntegration).not.toHaveBeenCalled();
  });

  it("with callouts:true: registers callouts remark plugin", async () => {
    const integration = mdxNotebook({ callouts: true });
    const calls: unknown[] = [];
    const updateConfig = vi.fn((c: unknown) => { calls.push(c); });
    const addIntegration = vi.fn();
    await (integration.hooks["astro:config:setup"] as (c: unknown) => Promise<void>)({
      updateConfig, addIntegration, config: {}
    });
    // Two updateConfig calls: one for vite plugins, one for markdown.remarkPlugins
    expect(updateConfig).toHaveBeenCalledTimes(2);
    const found = calls.find((c) => (c as { markdown?: { remarkPlugins?: unknown[] } }).markdown);
    expect(found).toBeDefined();
  });
});
