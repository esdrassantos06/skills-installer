import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RunCard } from "./RunCard";
import type { Run } from "./runsReducer";

function makeRun(overrides: Partial<Run> = {}): Run {
  return {
    index: 0,
    cmd: "npx skills add a/b@one",
    source: "a/b@one",
    status: "pending",
    log: [],
    expanded: false,
    ...overrides,
  };
}

function renderInList(run: Run, onToggle = () => {}) {
  return render(
    <ul>
      <RunCard run={run} onToggle={onToggle} />
    </ul>,
  );
}

describe("RunCard", () => {
  it("exposes the run as a toggle button with status in its accessible name", () => {
    renderInList(makeRun({ status: "running" }));
    const button = screen.getByRole("button", { name: /a\/b@one, running/i });
    expect(button).toHaveAttribute("aria-expanded", "false");
  });

  it("reflects the expanded state via aria-expanded", () => {
    renderInList(
      makeRun({ expanded: true, log: [{ stream: "out", text: "hi" }] }),
    );
    expect(screen.getByRole("button")).toHaveAttribute("aria-expanded", "true");
  });

  it("calls onToggle when activated", () => {
    const onToggle = vi.fn();
    renderInList(makeRun(), onToggle);
    fireEvent.click(screen.getByRole("button"));
    expect(onToggle).toHaveBeenCalledOnce();
  });

  it("shows the exit code for a failed run", () => {
    renderInList(makeRun({ status: "err", exitCode: 1 }));
    expect(screen.getByText("exit 1")).toBeInTheDocument();
  });

  it("renders log lines only when expanded", () => {
    const log = [{ stream: "out" as const, text: "build output" }];
    const { rerender } = renderInList(makeRun({ expanded: false, log }));
    expect(screen.queryByText("build output")).not.toBeInTheDocument();
    rerender(
      <ul>
        <RunCard run={makeRun({ expanded: true, log })} onToggle={() => {}} />
      </ul>,
    );
    expect(screen.getByText("build output")).toBeInTheDocument();
  });

  it("renders untrusted source and log text as inert text, not markup (XSS guard)", () => {
    const evil = '<img src=x onerror="alert(1)">';
    renderInList(
      makeRun({
        source: evil,
        expanded: true,
        log: [{ stream: "err", text: evil }],
      }),
    );
    expect(document.querySelector("img")).toBeNull();
    expect(screen.getAllByText(evil).length).toBeGreaterThan(0);
  });

  it("is memoized so unchanged cards skip re-render", () => {
    expect((RunCard as unknown as { $$typeof?: symbol }).$$typeof).toBe(
      Symbol.for("react.memo"),
    );
  });

  it("opts off-screen cards out of rendering with content-visibility", () => {
    const { container } = renderInList(makeRun());
    const li = container.querySelector("li");
    expect(li?.className).toContain("[content-visibility:auto]");
  });
});
