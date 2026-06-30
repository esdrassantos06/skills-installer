import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useAutoFollow } from "./useAutoFollow";
import { runsReducer, type Run } from "./runsReducer";

function planned(): Run[] {
  return runsReducer([], {
    type: "plan",
    commands: [
      { display: "one", source: "a/b@one" },
      { display: "two", source: "c/d@two" },
    ],
  });
}

function Harness({ runs }: { runs: Run[] }) {
  const { containerRef, following, activeIndex, onScroll, follow } =
    useAutoFollow(runs);
  return (
    <div>
      <output data-testid="following">{String(following)}</output>
      <output data-testid="active">{activeIndex}</output>
      <button onClick={follow}>follow</button>
      <div ref={containerRef} onScroll={onScroll} data-testid="container">
        {runs.map((r) => (
          <div key={r.index} data-run-index={r.index}>
            {r.source}
          </div>
        ))}
      </div>
    </div>
  );
}

describe("useAutoFollow", () => {
  it("follows by default and exposes the active run index", () => {
    render(<Harness runs={planned()} />);
    expect(screen.getByTestId("following")).toHaveTextContent("true");
    expect(screen.getByTestId("active")).toHaveTextContent("0");
  });

  it("reports no active run once everything is finished", () => {
    let runs = planned();
    runs = runsReducer(runs, {
      type: "done",
      index: 0,
      code: 0,
      alreadyInstalled: false,
    });
    runs = runsReducer(runs, {
      type: "done",
      index: 1,
      code: 0,
      alreadyInstalled: false,
    });
    render(<Harness runs={runs} />);
    expect(screen.getByTestId("active")).toHaveTextContent("-1");
  });

  it("follow() keeps follow mode enabled", () => {
    render(<Harness runs={planned()} />);
    fireEvent.click(screen.getByText("follow"));
    expect(screen.getByTestId("following")).toHaveTextContent("true");
  });
});
