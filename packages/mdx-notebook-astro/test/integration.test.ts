import { describe, it, expect } from "vitest";
import mdxNotebook from "../src/index.js";

describe("default integration export", () => {
  it("returns an Astro integration object with a name and empty hooks", () => {
    const integration = mdxNotebook();
    expect(integration.name).toBe("mdx-notebook-astro");
    expect(integration.hooks).toEqual({});
  });
});
