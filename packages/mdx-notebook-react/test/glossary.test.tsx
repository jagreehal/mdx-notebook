import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { Glossary, Term } from "../src/glossary.js";

afterEach(cleanup);

const terms = [
  { name: "LLM", definition: "Large Language Model" },
  { name: "Token", definition: "A unit of text" }
];

describe("Glossary + Term", () => {
  it("renders term text inline", () => {
    render(
      <Glossary terms={terms}>
        <Term>LLM</Term>
      </Glossary>
    );
    expect(screen.getByText("LLM")).toBeTruthy();
  });

  it("does not show definition before click", () => {
    render(
      <Glossary terms={terms}>
        <Term>LLM</Term>
      </Glossary>
    );
    expect(screen.queryByText("Large Language Model")).toBeNull();
  });

  it("shows definition after clicking the term", () => {
    render(
      <Glossary terms={terms}>
        <Term>LLM</Term>
      </Glossary>
    );
    fireEvent.click(screen.getByText("LLM"));
    expect(screen.getByText("Large Language Model")).toBeTruthy();
  });

  it("toggles definition off on second click", () => {
    render(
      <Glossary terms={terms}>
        <Term>LLM</Term>
      </Glossary>
    );
    const el = screen.getByText("LLM");
    fireEvent.click(el);
    fireEvent.click(el);
    expect(screen.queryByText("Large Language Model")).toBeNull();
  });

  it("renders plain span when term is not in glossary", () => {
    render(
      <Glossary terms={terms}>
        <Term>unknown-term</Term>
      </Glossary>
    );
    expect(screen.getByText("unknown-term")).toBeTruthy();
    // no mdx-nb-term class (just a plain span)
    expect(document.querySelector(".mdx-nb-term")).toBeNull();
  });

  it("uses name prop for lookup when provided (children is display text)", () => {
    render(
      <Glossary terms={terms}>
        <Term name="LLM">Large Language Model abbreviated</Term>
      </Glossary>
    );
    fireEvent.click(screen.getByText("Large Language Model abbreviated"));
    expect(screen.getByText("Large Language Model")).toBeTruthy();
  });
});
