import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { TokenStream } from "../src/token-stream.js";

afterEach(cleanup);

describe("TokenStream", () => {
  it("with autoStart=false, renders full text immediately", () => {
    const text = "Hello, world!";
    const { container } = render(<TokenStream text={text} autoStart={false} />);
    const code = container.querySelector("code");
    expect(code).not.toBeNull();
    expect(code!.textContent).toBe(text);
  });

  it("with autoStart=true, initial shown is 0 (starting state shows empty)", () => {
    const text = "Streaming text here";
    // Render with autoStart=true; the component initializes shown to 0
    // We can't observe 0 directly because effects run async, but we verify
    // that the component mounts without error and the pre/code structure exists
    const { container } = render(<TokenStream text={text} autoStart={true} durationMs={100000} />);
    const pre = container.querySelector("pre.mdx-nb-stream");
    expect(pre).not.toBeNull();
    const code = container.querySelector("code");
    expect(code).not.toBeNull();
    // The initial render (before effects) has shown=0, so text should be empty string
    expect(code!.textContent).toBe("");
  });
});
