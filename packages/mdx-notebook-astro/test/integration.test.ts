import { describe, it, expect } from "vitest";
import mdxNotebook from "../src/index.js";

describe("default integration export", () => {
  it("returns an Astro integration object with a name and the config:setup hook", () => {
    const integration = mdxNotebook();
    expect(integration.name).toBe("mdx-notebook-astro");
    expect(typeof integration.hooks["astro:config:setup"]).toBe("function");
  });
});
