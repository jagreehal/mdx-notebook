import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { Predict } from "../src/predict.js";

afterEach(cleanup);

describe("Predict", () => {
  it("renders prompt children and hides result before reveal", () => {
    const { container } = render(
      <Predict expected="42">
        <span>What is the answer?</span>
      </Predict>
    );
    expect(container.textContent).toContain("What is the answer?");
    expect(container.textContent).not.toContain("Correct");
    expect(container.textContent).not.toContain("Not quite");
  });

  it("shows Correct after clicking Reveal with a correct guess", () => {
    render(<Predict expected="42" />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "42" } });
    fireEvent.click(screen.getByRole("button", { name: /reveal/i }));
    expect(screen.getByText(/correct/i)).toBeTruthy();
    expect(screen.queryByText(/not quite/i)).toBeNull();
  });

  it("shows Not quite and expected after clicking Reveal with a wrong guess", () => {
    render(<Predict expected="42" />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "99" } });
    fireEvent.click(screen.getByRole("button", { name: /reveal/i }));
    expect(screen.getByText(/not quite/i)).toBeTruthy();
    expect(screen.getByText("42")).toBeTruthy();
  });
});
