import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { Exercise } from "../src/exercise.js";

afterEach(cleanup);

describe("Exercise", () => {
  it("renders the prompt", () => {
    render(<Exercise prompt="Type something" answer="hello" />);
    expect(screen.getByText("Type something")).toBeTruthy();
  });

  it("renders a Check button", () => {
    render(<Exercise prompt="P" answer="hello" />);
    expect(screen.getByRole("button", { name: /check/i })).toBeTruthy();
  });

  it("shows Correct when the answer matches (whitespace-normalized)", () => {
    render(<Exercise prompt="P" answer="hello world" />);
    fireEvent.change(screen.getByLabelText(/your answer/i), { target: { value: "  hello   world  " } });
    fireEvent.click(screen.getByRole("button", { name: /check/i }));
    expect(screen.getByText(/correct/i)).toBeTruthy();
  });

  it("shows 'Show answer' when wrong", () => {
    render(<Exercise prompt="P" answer="hello" />);
    fireEvent.change(screen.getByLabelText(/your answer/i), { target: { value: "wrong" } });
    fireEvent.click(screen.getByRole("button", { name: /check/i }));
    expect(screen.getByText(/show answer/i)).toBeTruthy();
    expect(screen.queryByText(/correct/i)).toBeNull();
  });

  it("uses contains-based checking when contains prop is provided", () => {
    render(<Exercise prompt="P" answer="irrelevant" contains={["foo", "bar"]} />);
    fireEvent.change(screen.getByLabelText(/your answer/i), { target: { value: "foo bar baz" } });
    fireEvent.click(screen.getByRole("button", { name: /check/i }));
    expect(screen.getByText(/correct/i)).toBeTruthy();
  });

  it("fails contains check when a required string is missing", () => {
    render(<Exercise prompt="P" answer="irrelevant" contains={["foo", "bar"]} />);
    fireEvent.change(screen.getByLabelText(/your answer/i), { target: { value: "foo only" } });
    fireEvent.click(screen.getByRole("button", { name: /check/i }));
    expect(screen.getByText(/show answer/i)).toBeTruthy();
  });
});
