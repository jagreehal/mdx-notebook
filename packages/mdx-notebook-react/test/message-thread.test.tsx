import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { MessageThread } from "../src/message-thread.js";

afterEach(cleanup);

describe("MessageThread", () => {
  it("renders one msg per role correctly with role label", () => {
    const messages = [
      { role: "user" as const, content: "Hello" },
      { role: "assistant" as const, content: "Hi there" },
      { role: "system" as const, content: "You are helpful" },
      { role: "tool" as const, content: "Tool result" },
    ];
    const { container } = render(<MessageThread messages={messages} />);
    expect(container.textContent).toContain("user");
    expect(container.textContent).toContain("Hello");
    expect(container.textContent).toContain("assistant");
    expect(container.textContent).toContain("Hi there");
    expect(container.textContent).toContain("system");
    expect(container.textContent).toContain("You are helpful");
    expect(container.textContent).toContain("tool");
    expect(container.textContent).toContain("Tool result");
    expect(container.querySelectorAll(".mdx-nb-msg")).toHaveLength(4);
    expect(container.querySelector(".mdx-nb-msg-user")).not.toBeNull();
    expect(container.querySelector(".mdx-nb-msg-assistant")).not.toBeNull();
    expect(container.querySelector(".mdx-nb-msg-system")).not.toBeNull();
    expect(container.querySelector(".mdx-nb-msg-tool")).not.toBeNull();
  });

  it("renders nested tool calls with input/output JSON", () => {
    const messages = [
      {
        role: "assistant" as const,
        content: "Calling a tool",
        toolCalls: [
          {
            name: "search",
            input: { query: "cats" },
            output: { results: ["cat1", "cat2"] },
            durationMs: 123,
          },
        ],
      },
    ];
    const { container } = render(<MessageThread messages={messages} />);
    expect(container.textContent).toContain("search");
    expect(container.textContent).toContain("123ms");
    expect(container.textContent).toContain('"query"');
    expect(container.textContent).toContain('"cats"');
    expect(container.textContent).toContain('"results"');
    expect(container.textContent).toContain("cat1");
    expect(container.querySelector(".mdx-nb-tool")).not.toBeNull();
  });

  it("empty messages array renders empty container", () => {
    const { container } = render(<MessageThread messages={[]} />);
    const thread = container.querySelector(".mdx-nb-thread");
    expect(thread).not.toBeNull();
    expect(container.querySelectorAll(".mdx-nb-msg")).toHaveLength(0);
  });
});
