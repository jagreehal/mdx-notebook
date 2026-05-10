// packages/core/test/runtime/react.test.tsx
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, act, cleanup } from "@testing-library/react";

afterEach(cleanup);
import * as React from "react";
import { OutputProvider, useCellOutput, useOutputStore } from "../../src/runtime/react.js";
import { createOutputStore } from "../../src/runtime/store.js";
import type { Manifest } from "../../src/types.js";

const m: Manifest = {
  pageId: "p", builtAt: 0,
  cells: {
    a: { cellId: "a", status: "ok", durationMs: 0, exitCode: 0, stdout: [], stderr: [], result: { n: 1 } }
  }
};

function Reader() {
  const out = useCellOutput<{ n: number }>("a");
  return <div data-testid="n">{out.result?.n ?? "-"}</div>;
}

describe("useCellOutput", () => {
  it("reads from the store", () => {
    const store = createOutputStore(m);
    render(<OutputProvider store={store}><Reader /></OutputProvider>);
    expect(screen.getByTestId("n").textContent).toBe("1");
  });

  it("re-renders when result changes", () => {
    const store = createOutputStore(m);
    render(<OutputProvider store={store}><Reader /></OutputProvider>);
    act(() => { store.setResult("a", { n: 5 }); });
    expect(screen.getByTestId("n").textContent).toBe("5");
  });

  it("throws when no provider in scope", () => {
    expect(() => render(<Reader />)).toThrow(/OutputProvider/);
  });
});

describe("useOutputStore", () => {
  it("returns the store from context", () => {
    const store = createOutputStore(m);
    let captured: ReturnType<typeof useOutputStore> | undefined;
    function StoreReader() {
      captured = useOutputStore();
      return null;
    }
    render(<OutputProvider store={store}><StoreReader /></OutputProvider>);
    expect(captured).toBe(store);
  });

  it("throws without provider", () => {
    function StoreReader() {
      useOutputStore();
      return null;
    }
    expect(() => render(<StoreReader />)).toThrow(/OutputProvider/);
  });
});
