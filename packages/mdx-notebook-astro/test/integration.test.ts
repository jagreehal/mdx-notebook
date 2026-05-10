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

describe("before/after hooks", () => {
  it("registers astro:build:start handler when `before` is provided", () => {
    const integration = mdxNotebook({ before: ["echo 'before'"] });
    expect(typeof (integration.hooks as Record<string, unknown>)["astro:build:start"]).toBe("function");
  });

  it("registers astro:build:done handler when `after` is provided", () => {
    const integration = mdxNotebook({ after: ["echo 'after'"] });
    expect(typeof (integration.hooks as Record<string, unknown>)["astro:build:done"]).toBe("function");
  });

  it("before-hook bash command runs and resolves on success", async () => {
    const integration = mdxNotebook({ before: ["true"] });
    const fn = (integration.hooks as Record<string, () => Promise<void>>)["astro:build:start"];
    await expect(fn()).resolves.toBeUndefined();
  });

  it("before-hook bash command rejects on non-zero exit", async () => {
    const integration = mdxNotebook({ before: ["false"] });
    const fn = (integration.hooks as Record<string, () => Promise<void>>)["astro:build:start"];
    await expect(fn()).rejects.toThrow(/exited with code/);
  });

  it("after-hook warns but does not throw on failure", async () => {
    const integration = mdxNotebook({ after: ["false"] });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const fn = (integration.hooks as Record<string, () => Promise<void>>)["astro:build:done"];
    await expect(fn()).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe("env status virtual module", () => {
  it("with env array, env-status plugin is registered", async () => {
    const integration = mdxNotebook({ env: ["TEST_VAR"] });
    const updates: Array<Record<string, unknown>> = [];
    const updateConfig = vi.fn((c: Record<string, unknown>) => { updates.push(c); });
    const addIntegration = vi.fn();
    await (integration.hooks["astro:config:setup"] as (c: unknown) => Promise<void>)({
      updateConfig, addIntegration, config: {}
    } as unknown as never);
    const hasEnvPlugin = updates.some((u) => {
      const vite = u.vite as { plugins?: Array<{ name?: string }> } | undefined;
      return vite?.plugins?.some((p) => p.name === "mdx-notebook-env-status");
    });
    expect(hasEnvPlugin).toBe(true);
  });
});
