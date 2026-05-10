import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { FillIn } from "../src/fill-in.js";

afterEach(cleanup);

describe("FillIn", () => {
  it("renders input and check button; no hint before clicking", () => {
    const { container } = render(<FillIn answer="hello" />);
    expect(screen.getByRole("textbox")).toBeTruthy();
    expect(screen.getByRole("button")).toBeTruthy();
    expect(container.textContent).not.toContain("expected:");
  });

  it("correct guess after click shows ok class and no hint", () => {
    render(<FillIn answer="hello" />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "hello" } });
    fireEvent.click(screen.getByRole("button"));
    expect(input.className).toContain("mdx-nb-fillin-ok");
    expect(screen.queryByText(/expected:/)).toBeNull();
  });

  it("wrong guess shows wrong class and hint with expected value", () => {
    render(<FillIn answer="hello" />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "world" } });
    fireEvent.click(screen.getByRole("button"));
    expect(input.className).toContain("mdx-nb-fillin-wrong");
    expect(screen.getByText("hello")).toBeTruthy();
  });
});
